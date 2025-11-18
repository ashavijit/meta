/**
 * Versioning system for Meta configuration files
 * Implements content hashing similar to Git's object model
 * Production-ready with error handling, validation, and integrity checks
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Custom error classes for better error handling
 */
class VersioningError extends Error {
  constructor(message, code = 'VERSIONING_ERROR') {
    super(message);
    this.name = 'VersioningError';
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ObjectNotFoundError extends VersioningError {
  constructor(hash) {
    super(`Object not found: ${hash}`, 'OBJECT_NOT_FOUND');
    this.hash = hash;
  }
}

class IntegrityError extends VersioningError {
  constructor(message) {
    super(message, 'INTEGRITY_ERROR');
  }
}

/**
 * Computes SHA256 hash of content
 * @param {string} content - Content to hash
 * @returns {string} SHA256 hash (64 character hex string)
 * @throws {VersioningError} If content is invalid
 */
function computeHash(content) {
  if (typeof content !== 'string') {
    throw new VersioningError('Content must be a string', 'INVALID_CONTENT');
  }
  
  if (content.length === 0) {
    throw new VersioningError('Content cannot be empty', 'EMPTY_CONTENT');
  }
  
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Validates hash format
 * @param {string} hash - Hash to validate
 * @returns {boolean} True if valid
 */
function isValidHash(hash) {
  return typeof hash === 'string' && /^[a-f0-9]{64}$/i.test(hash);
}

/**
 * Validates short hash (for partial matches)
 * @param {string} hash - Hash to validate
 * @returns {boolean} True if valid
 */
function isValidShortHash(hash) {
  return typeof hash === 'string' && /^[a-f0-9]{4,64}$/i.test(hash);
}

/**
 * Gets the path to the .meta directory
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @returns {string} Path to .meta directory
 */
function getMetaDir(baseDir = process.cwd()) {
  return path.join(baseDir, '.meta');
}

/**
 * Initializes the .meta directory structure
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @throws {VersioningError} If initialization fails
 */
function initMetaDir(baseDir = process.cwd()) {
  const metaDir = getMetaDir(baseDir);
  
  if (fs.existsSync(metaDir)) {
    throw new VersioningError('.meta directory already exists', 'ALREADY_INITIALIZED');
  }
  
  try {
    fs.mkdirSync(path.join(metaDir, 'objects'), { recursive: true });
    fs.mkdirSync(path.join(metaDir, 'refs', 'tags'), { recursive: true });
    fs.mkdirSync(path.join(metaDir, 'refs', 'branches'), { recursive: true });
    fs.mkdirSync(path.join(metaDir, 'refs', 'heads'), { recursive: true });
    
    // Initialize empty history
    fs.writeFileSync(
      path.join(metaDir, 'history.json'),
      JSON.stringify([], null, 2)
    );
  } catch (error) {
    throw new VersioningError(
      `Failed to initialize .meta directory: ${error.message}`,
      'INIT_FAILED'
    );
  }
}

/**
 * Checks if .meta directory is initialized
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @returns {boolean} True if initialized
 */
function isInitialized(baseDir = process.cwd()) {
  const metaDir = getMetaDir(baseDir);
  return fs.existsSync(metaDir) && fs.existsSync(path.join(metaDir, 'objects'));
}

/**
 * Gets the path to the objects directory
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @returns {string} Path to objects directory
 */
function getObjectsDir(baseDir = process.cwd()) {
  return path.join(getMetaDir(baseDir), 'objects');
}

/**
 * Gets the path to the refs directory
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @returns {string} Path to refs directory
 */
function getRefsDir(baseDir = process.cwd()) {
  return path.join(getMetaDir(baseDir), 'refs');
}

/**
 * Gets the path to the history file
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @returns {string} Path to history.json
 */
function getHistoryFile(baseDir = process.cwd()) {
  return path.join(getMetaDir(baseDir), 'history.json');
}

/**
 * Gets the path to the latest ref file
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @returns {string} Path to latest ref file
 */
function getLatestRefFile(baseDir = process.cwd()) {
  return path.join(getRefsDir(baseDir), 'latest');
}

/**
 * Converts a hash to object path format (first 2 chars / remainder)
 * @param {string} hash - Hash to convert
 * @returns {string} Object path
 * @throws {VersioningError} If hash is invalid
 */
function hashToPath(hash) {
  if (!isValidHash(hash) && !isValidShortHash(hash)) {
    throw new VersioningError(`Invalid hash format: ${hash}`, 'INVALID_HASH');
  }
  
  if (hash.length < 2) {
    throw new VersioningError('Hash too short', 'INVALID_HASH');
  }
  
  return path.join(hash.substring(0, 2), hash.substring(2));
}

/**
 * Gets the full path to an object file
 * @param {string} hash - Hash of the object
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @returns {string} Full path to object file
 */
function getObjectPath(hash, baseDir = process.cwd()) {
  return path.join(getObjectsDir(baseDir), hashToPath(hash));
}

/**
 * Checks if an object already exists
 * @param {string} hash - Hash to check
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @returns {boolean} True if object exists
 */
function objectExists(hash, baseDir = process.cwd()) {
  if (!isValidHash(hash)) {
    return false;
  }
  return fs.existsSync(getObjectPath(hash, baseDir));
}

/**
 * Stores content as an object
 * @param {string} content - Content to store
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @returns {string} Hash of stored content
 * @throws {VersioningError} If storage fails
 */
function storeObject(content, baseDir = process.cwd()) {
  if (!isInitialized(baseDir)) {
    throw new VersioningError(
      '.meta directory not initialized. Run "meta init" first.',
      'NOT_INITIALIZED'
    );
  }
  
  const hash = computeHash(content);
  
  // Check if object already exists
  if (objectExists(hash, baseDir)) {
    // Verify integrity
    const storedContent = readObject(hash, baseDir);
    if (storedContent !== content) {
      throw new IntegrityError(
        `Hash collision detected for ${hash.substring(0, 8)}...`
      );
    }
    return hash;
  }
  
  // Create directory structure if it doesn't exist
  const objectPath = getObjectPath(hash, baseDir);
  const objectDir = path.dirname(objectPath);
  
  try {
    if (!fs.existsSync(objectDir)) {
      fs.mkdirSync(objectDir, { recursive: true });
    }
    
    // Write object content atomically using temporary file
    const tempPath = `${objectPath}.tmp`;
    fs.writeFileSync(tempPath, content, 'utf8');
    fs.renameSync(tempPath, objectPath);
    
    // Verify integrity after write
    const verifyContent = fs.readFileSync(objectPath, 'utf8');
    if (verifyContent !== content) {
      fs.unlinkSync(objectPath);
      throw new IntegrityError('Failed to verify stored object integrity');
    }
    
    return hash;
  } catch (error) {
    if (error instanceof VersioningError) {
      throw error;
    }
    throw new VersioningError(
      `Failed to store object: ${error.message}`,
      'STORE_FAILED'
    );
  }
}

/**
 * Reads an object by hash (supports partial hashes)
 * @param {string} hash - Hash of object to read (can be partial, minimum 4 chars)
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @returns {string} Object content
 * @throws {ObjectNotFoundError} If object not found
 * @throws {VersioningError} If hash is invalid or multiple matches found
 */
function readObject(hash, baseDir = process.cwd()) {
  if (!isValidShortHash(hash)) {
    throw new VersioningError(`Invalid hash format: ${hash}`, 'INVALID_HASH');
  }
  
  // First try exact match if it's a full hash
  if (isValidHash(hash)) {
    const objectPath = getObjectPath(hash, baseDir);
    
    if (fs.existsSync(objectPath)) {
      try {
        const content = fs.readFileSync(objectPath, 'utf8');
        // Verify integrity
        const computedHash = computeHash(content);
        if (computedHash !== hash) {
          throw new IntegrityError(
            `Hash mismatch for object ${hash.substring(0, 8)}...`
          );
        }
        return content;
      } catch (error) {
        if (error instanceof VersioningError) {
          throw error;
        }
        throw new VersioningError(
          `Failed to read object: ${error.message}`,
          'READ_FAILED'
        );
      }
    }
  }
  
  // If not found and hash is short, try to find matching full hash
  if (hash.length < 64) {
    const objectsDir = getObjectsDir(baseDir);
    
    if (!fs.existsSync(objectsDir)) {
      throw new ObjectNotFoundError(hash);
    }
    
    const matches = [];
    const dirs = fs.readdirSync(objectsDir);
    
    for (const dir of dirs) {
      const dirPath = path.join(objectsDir, dir);
      
      if (!fs.statSync(dirPath).isDirectory()) {
        continue;
      }
      
      // Check if directory name matches hash prefix
      if (!hash.toLowerCase().startsWith(dir.toLowerCase())) {
        continue;
      }
      
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const fullHash = dir + file;
        
        if (fullHash.toLowerCase().startsWith(hash.toLowerCase())) {
          const objectPath = getObjectPath(fullHash, baseDir);
          
          if (fs.existsSync(objectPath)) {
            matches.push({ hash: fullHash, path: objectPath });
          }
        }
      }
    }
    
    if (matches.length === 0) {
      throw new ObjectNotFoundError(hash);
    }
    
    if (matches.length > 1) {
      throw new VersioningError(
        `Ambiguous hash '${hash}': matches ${matches.length} objects. Use a longer hash.`,
        'AMBIGUOUS_HASH'
      );
    }
    
    try {
      const content = fs.readFileSync(matches[0].path, 'utf8');
      // Verify integrity
      const computedHash = computeHash(content);
      if (computedHash !== matches[0].hash) {
        throw new IntegrityError(
          `Hash mismatch for object ${matches[0].hash.substring(0, 8)}...`
        );
      }
      return content;
    } catch (error) {
      if (error instanceof VersioningError) {
        throw error;
      }
      throw new VersioningError(
        `Failed to read object: ${error.message}`,
        'READ_FAILED'
      );
    }
  }
  
  throw new ObjectNotFoundError(hash);
}

/**
 * Updates the latest ref to point to a hash
 * @param {string} hash - Hash to set as latest
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @throws {VersioningError} If hash is invalid or object doesn't exist
 */
function updateLatestRef(hash, baseDir = process.cwd()) {
  if (!isValidHash(hash)) {
    throw new VersioningError(`Invalid hash: ${hash}`, 'INVALID_HASH');
  }
  
  // Verify object exists
  if (!objectExists(hash, baseDir)) {
    throw new ObjectNotFoundError(hash);
  }
  
  try {
    const latestRefFile = getLatestRefFile(baseDir);
    const refsDir = path.dirname(latestRefFile);
    
    if (!fs.existsSync(refsDir)) {
      fs.mkdirSync(refsDir, { recursive: true });
    }
    
    fs.writeFileSync(latestRefFile, hash, 'utf8');
  } catch (error) {
    throw new VersioningError(
      `Failed to update latest ref: ${error.message}`,
      'UPDATE_REF_FAILED'
    );
  }
}

/**
 * Gets the current latest hash
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @returns {string|null} Latest hash or null if none
 */
function getLatestHash(baseDir = process.cwd()) {
  const latestRefFile = getLatestRefFile(baseDir);
  
  if (!fs.existsSync(latestRefFile)) {
    return null;
  }
  
  try {
    const hash = fs.readFileSync(latestRefFile, 'utf8').trim();
    
    if (!isValidHash(hash)) {
      return null;
    }
    
    return hash;
  } catch (error) {
    return null;
  }
}

/**
 * Gets history entries
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @returns {Array} Array of history entries
 * @throws {VersioningError} If history file is corrupted
 */
function getHistory(baseDir = process.cwd()) {
  const historyFile = getHistoryFile(baseDir);
  
  if (!fs.existsSync(historyFile)) {
    return [];
  }
  
  try {
    const content = fs.readFileSync(historyFile, 'utf8');
    const history = JSON.parse(content);
    
    if (!Array.isArray(history)) {
      throw new VersioningError('History file is corrupted', 'CORRUPTED_HISTORY');
    }
    
    return history;
  } catch (error) {
    if (error instanceof VersioningError) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw new VersioningError(
        'History file is corrupted (invalid JSON)',
        'CORRUPTED_HISTORY'
      );
    }
    throw new VersioningError(
      `Failed to read history: ${error.message}`,
      'READ_HISTORY_FAILED'
    );
  }
}

/**
 * Adds an entry to history
 * @param {Object} entry - History entry to add
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @throws {VersioningError} If entry is invalid or write fails
 */
function addToHistory(entry, baseDir = process.cwd()) {
  // Validate entry
  if (!entry || typeof entry !== 'object') {
    throw new VersioningError('History entry must be an object', 'INVALID_ENTRY');
  }
  
  if (!entry.hash || !isValidHash(entry.hash)) {
    throw new VersioningError('History entry must have a valid hash', 'INVALID_ENTRY');
  }
  
  if (!entry.message || typeof entry.message !== 'string') {
    throw new VersioningError('History entry must have a message', 'INVALID_ENTRY');
  }
  
  if (!entry.timestamp) {
    entry.timestamp = new Date().toISOString();
  }
  
  try {
    const history = getHistory(baseDir);
    history.push(entry);
    
    const historyFile = getHistoryFile(baseDir);
    
    // Write atomically
    const tempFile = `${historyFile}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(history, null, 2), 'utf8');
    fs.renameSync(tempFile, historyFile);
  } catch (error) {
    if (error instanceof VersioningError) {
      throw error;
    }
    throw new VersioningError(
      `Failed to add history entry: ${error.message}`,
      'WRITE_HISTORY_FAILED'
    );
  }
}

/**
 * Creates a tag pointing to a hash
 * @param {string} tagName - Name of the tag
 * @param {string} hash - Hash to tag (defaults to latest)
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @throws {VersioningError} If tag name is invalid or hash doesn't exist
 */
function createTag(tagName, hash = null, baseDir = process.cwd()) {
  if (!tagName || typeof tagName !== 'string' || tagName.trim().length === 0) {
    throw new VersioningError('Tag name must be a non-empty string', 'INVALID_TAG_NAME');
  }
  
  // Validate tag name format (alphanumeric, dots, dashes, underscores)
  if (!/^[a-zA-Z0-9._-]+$/.test(tagName)) {
    throw new VersioningError(
      'Tag name can only contain alphanumeric characters, dots, dashes, and underscores',
      'INVALID_TAG_NAME'
    );
  }
  
  // Use latest hash if not provided
  if (!hash) {
    hash = getLatestHash(baseDir);
    if (!hash) {
      throw new VersioningError('No latest version available', 'NO_LATEST_VERSION');
    }
  }
  
  if (!isValidHash(hash)) {
    throw new VersioningError(`Invalid hash: ${hash}`, 'INVALID_HASH');
  }
  
  // Verify object exists
  if (!objectExists(hash, baseDir)) {
    throw new ObjectNotFoundError(hash);
  }
  
  try {
    const tagDir = path.join(getRefsDir(baseDir), 'tags');
    
    if (!fs.existsSync(tagDir)) {
      fs.mkdirSync(tagDir, { recursive: true });
    }
    
    const tagFile = path.join(tagDir, tagName);
    fs.writeFileSync(tagFile, hash, 'utf8');
  } catch (error) {
    throw new VersioningError(
      `Failed to create tag: ${error.message}`,
      'CREATE_TAG_FAILED'
    );
  }
}

/**
 * Gets the hash a tag points to
 * @param {string} tagName - Name of the tag
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @returns {string|null} Hash or null if tag doesn't exist
 */
function readTag(tagName, baseDir = process.cwd()) {
  const tagFile = path.join(getRefsDir(baseDir), 'tags', tagName);
  
  if (!fs.existsSync(tagFile)) {
    return null;
  }
  
  try {
    const hash = fs.readFileSync(tagFile, 'utf8').trim();
    
    if (!isValidHash(hash)) {
      return null;
    }
    
    return hash;
  } catch (error) {
    return null;
  }
}

/**
 * Lists all tags
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @returns {Array<{name: string, hash: string}>} Array of tag objects
 */
function listTags(baseDir = process.cwd()) {
  const tagDir = path.join(getRefsDir(baseDir), 'tags');
  
  if (!fs.existsSync(tagDir)) {
    return [];
  }
  
  try {
    const files = fs.readdirSync(tagDir);
    const tags = [];
    
    for (const file of files) {
      const tagFile = path.join(tagDir, file);
      const stat = fs.statSync(tagFile);
      
      if (stat.isFile()) {
        const hash = fs.readFileSync(tagFile, 'utf8').trim();
        if (isValidHash(hash)) {
          tags.push({ name: file, hash });
        }
      }
    }
    
    return tags.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    return [];
  }
}

/**
 * Deletes a tag
 * @param {string} tagName - Name of the tag to delete
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @throws {VersioningError} If tag doesn't exist
 */
function deleteTag(tagName, baseDir = process.cwd()) {
  const tagFile = path.join(getRefsDir(baseDir), 'tags', tagName);
  
  if (!fs.existsSync(tagFile)) {
    throw new VersioningError(`Tag '${tagName}' does not exist`, 'TAG_NOT_FOUND');
  }
  
  try {
    fs.unlinkSync(tagFile);
  } catch (error) {
    throw new VersioningError(
      `Failed to delete tag: ${error.message}`,
      'DELETE_TAG_FAILED'
    );
  }
}

/**
 * Creates or updates a branch
 * @param {string} branchName - Name of the branch
 * @param {string} hash - Hash to point to (defaults to latest)
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @throws {VersioningError} If branch name is invalid or hash doesn't exist
 */
function createBranch(branchName, hash = null, baseDir = process.cwd()) {
  if (!branchName || typeof branchName !== 'string' || branchName.trim().length === 0) {
    throw new VersioningError('Branch name must be a non-empty string', 'INVALID_BRANCH_NAME');
  }
  
  // Validate branch name format
  if (!/^[a-zA-Z0-9._-]+$/.test(branchName)) {
    throw new VersioningError(
      'Branch name can only contain alphanumeric characters, dots, dashes, and underscores',
      'INVALID_BRANCH_NAME'
    );
  }
  
  // Use latest hash if not provided
  if (!hash) {
    hash = getLatestHash(baseDir);
    if (!hash) {
      throw new VersioningError('No latest version available', 'NO_LATEST_VERSION');
    }
  }
  
  if (!isValidHash(hash)) {
    throw new VersioningError(`Invalid hash: ${hash}`, 'INVALID_HASH');
  }
  
  // Verify object exists
  if (!objectExists(hash, baseDir)) {
    throw new ObjectNotFoundError(hash);
  }
  
  try {
    const branchDir = path.join(getRefsDir(baseDir), 'branches');
    
    if (!fs.existsSync(branchDir)) {
      fs.mkdirSync(branchDir, { recursive: true });
    }
    
    const branchFile = path.join(branchDir, branchName);
    fs.writeFileSync(branchFile, hash, 'utf8');
  } catch (error) {
    throw new VersioningError(
      `Failed to create branch: ${error.message}`,
      'CREATE_BRANCH_FAILED'
    );
  }
}

/**
 * Gets the hash a branch points to
 * @param {string} branchName - Name of the branch
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @returns {string|null} Hash or null if branch doesn't exist
 */
function readBranch(branchName, baseDir = process.cwd()) {
  const branchFile = path.join(getRefsDir(baseDir), 'branches', branchName);
  
  if (!fs.existsSync(branchFile)) {
    return null;
  }
  
  try {
    const hash = fs.readFileSync(branchFile, 'utf8').trim();
    
    if (!isValidHash(hash)) {
      return null;
    }
    
    return hash;
  } catch (error) {
    return null;
  }
}

/**
 * Lists all branches
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @returns {Array<{name: string, hash: string}>} Array of branch objects
 */
function listBranches(baseDir = process.cwd()) {
  const branchDir = path.join(getRefsDir(baseDir), 'branches');
  
  if (!fs.existsSync(branchDir)) {
    return [];
  }
  
  try {
    const files = fs.readdirSync(branchDir);
    const branches = [];
    
    for (const file of files) {
      const branchFile = path.join(branchDir, file);
      const stat = fs.statSync(branchFile);
      
      if (stat.isFile()) {
        const hash = fs.readFileSync(branchFile, 'utf8').trim();
        if (isValidHash(hash)) {
          branches.push({ name: file, hash });
        }
      }
    }
    
    return branches.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    return [];
  }
}

/**
 * Computes diff between two versions
 * @param {string} hash1 - First hash (or null for working directory)
 * @param {string} hash2 - Second hash (or null for working directory)
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @returns {Object} Diff object with added, removed, and modified keys
 */
function computeDiff(hash1, hash2, baseDir = process.cwd()) {
  let content1 = null;
  let content2 = null;
  
  try {
    if (hash1) {
      content1 = readObject(hash1, baseDir);
    }
  } catch (error) {
    // Ignore if hash1 is null (working directory)
  }
  
  try {
    if (hash2) {
      content2 = readObject(hash2, baseDir);
    }
  } catch (error) {
    // Ignore if hash2 is null (working directory)
  }
  
  // Simple line-based diff
  const lines1 = content1 ? content1.split('\n') : [];
  const lines2 = content2 ? content2.split('\n') : [];
  
  const diff = {
    added: [],
    removed: [],
    modified: [],
    stats: {
      additions: 0,
      deletions: 0
    }
  };
  
  // Simple comparison (can be enhanced with proper diff algorithm)
  const maxLen = Math.max(lines1.length, lines2.length);
  
  for (let i = 0; i < maxLen; i++) {
    const line1 = lines1[i];
    const line2 = lines2[i];
    
    if (line1 === undefined) {
      diff.added.push({ line: i + 1, content: line2 });
      diff.stats.additions++;
    } else if (line2 === undefined) {
      diff.removed.push({ line: i + 1, content: line1 });
      diff.stats.deletions++;
    } else if (line1 !== line2) {
      diff.modified.push({
        line: i + 1,
        old: line1,
        new: line2
      });
      diff.stats.additions++;
      diff.stats.deletions++;
    }
  }
  
  return diff;
}

module.exports = {
  // Core functions
  computeHash,
  storeObject,
  readObject,
  updateLatestRef,
  getLatestHash,
  addToHistory,
  getHistory,
  
  // Tag functions
  createTag,
  readTag,
  listTags,
  deleteTag,
  
  // Branch functions
  createBranch,
  readBranch,
  listBranches,
  
  // Utility functions
  initMetaDir,
  isInitialized,
  objectExists,
  computeDiff,
  
  // Error classes
  VersioningError,
  ObjectNotFoundError,
  IntegrityError
};