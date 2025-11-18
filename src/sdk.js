/**
 * Meta SDK - Production-ready programmatic API
 * Provides a clean, high-level interface for all Meta versioning operations
 */

const fs = require('fs');
const path = require('path');
const versioning = require('./versioning');
const { parseMeta } = require('./parser');

/**
 * Main SDK class for Meta versioning operations
 */
class MetaSDK {
  /**
   * Creates a new MetaSDK instance
   * @param {Object} options - SDK options
   * @param {string} options.baseDir - Base directory (defaults to process.cwd())
   * @param {string} options.configFile - Config file path (defaults to 'config.meta')
   */
  constructor(options = {}) {
    this.baseDir = options.baseDir || process.cwd();
    this.configFile = options.configFile || 'config.meta';
    this.configPath = path.join(this.baseDir, this.configFile);
  }

  /**
   * Initializes the Meta versioning system
   * @throws {versioning.VersioningError} If already initialized
   */
  init() {
    versioning.initMetaDir(this.baseDir);
  }

  /**
   * Checks if Meta is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return versioning.isInitialized(this.baseDir);
  }

  /**
   * Gets the current working config content
   * @returns {string} Config content
   * @throws {Error} If config file doesn't exist
   */
  getWorkingConfig() {
    if (!fs.existsSync(this.configPath)) {
      throw new Error(`Config file not found: ${this.configPath}`);
    }
    return fs.readFileSync(this.configPath, 'utf8');
  }

  /**
   * Gets the current working config as parsed object
   * @returns {Object} Parsed config
   */
  getWorkingConfigParsed() {
    const content = this.getWorkingConfig();
    return parseMeta(content);
  }

  /**
   * Extracts @v tag from config content
   * @param {string} content - Config content
   * @returns {string|null} Version tag or null
   */
  extractVersionTag(content) {
    const versionMatch = content.match(/@v\s+([^\n]+)/i);
    return versionMatch ? versionMatch[1].trim() : null;
  }

  /**
   * Checks if @v tag has changed since last commit
   * @returns {boolean} True if version changed
   */
  hasVersionChanged() {
    const currentContent = this.getWorkingConfig();
    const currentVersion = this.extractVersionTag(currentContent);
    
    if (!currentVersion) {
      return false; // No @v tag found
    }
    
    const latestHash = versioning.getLatestHash(this.baseDir);
    if (!latestHash) {
      return true; // No previous version
    }
    
    try {
      const previousContent = versioning.readObject(latestHash, this.baseDir);
      const previousVersion = this.extractVersionTag(previousContent);
      
      return previousVersion !== currentVersion;
    } catch (error) {
      return true; // Couldn't read previous, consider changed
    }
  }

  /**
   * Pushes current config to version control (only if @v changed)
   * @param {string} message - Commit message
   * @param {Object} options - Push options
   * @param {boolean} options.force - Force push even if @v unchanged
   * @returns {Object} Push result with hash and info
   * @throws {versioning.VersioningError} If push fails
   */
  push(message, options = {}) {
    if (!this.isInitialized()) {
      throw new versioning.VersioningError(
        'Meta not initialized. Call init() first.',
        'NOT_INITIALIZED'
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new versioning.VersioningError(
        'Commit message is required',
        'INVALID_MESSAGE'
      );
    }

    const content = this.getWorkingConfig();
    
    // Check version change unless forced
    if (!options.force && !this.hasVersionChanged()) {
      return {
        skipped: true,
        reason: 'No version change detected (@v tag unchanged)',
        hash: versioning.getLatestHash(this.baseDir)
      };
    }

    // Store object
    const hash = versioning.storeObject(content, this.baseDir);
    
    // Get parent hash
    const parentHash = versioning.getLatestHash(this.baseDir);
    
    // Check if this is a duplicate (same hash as parent)
    if (parentHash && hash === parentHash) {
      return {
        skipped: true,
        reason: 'No changes detected (content identical to latest)',
        hash: hash
      };
    }
    
    // Update latest ref
    versioning.updateLatestRef(hash, this.baseDir);
    
    // Add to history
    const entry = {
      hash: hash,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      parent: parentHash
    };
    
    versioning.addToHistory(entry, this.baseDir);
    
    return {
      success: true,
      hash: hash,
      shortHash: hash.substring(0, 8),
      version: this.extractVersionTag(content),
      message: message.trim(),
      parent: parentHash
    };
  }

  /**
   * Checks out a specific version
   * @param {string} ref - Hash, tag, or branch name
   * @returns {Object} Checkout result
   * @throws {versioning.VersioningError} If checkout fails
   */
  checkout(ref) {
    if (!this.isInitialized()) {
      throw new versioning.VersioningError(
        'Meta not initialized. Call init() first.',
        'NOT_INITIALIZED'
      );
    }

    let hash = ref;
    let refType = 'hash';

    // Check if it's a tag
    const tagHash = versioning.readTag(ref, this.baseDir);
    if (tagHash) {
      hash = tagHash;
      refType = 'tag';
    } else {
      // Check if it's a branch
      const branchHash = versioning.readBranch(ref, this.baseDir);
      if (branchHash) {
        hash = branchHash;
        refType = 'branch';
      }
    }

    // Read the object
    const content = versioning.readObject(hash, this.baseDir);
    
    // Write to config file
    fs.writeFileSync(this.configPath, content, 'utf8');
    
    // Update latest ref
    versioning.updateLatestRef(hash, this.baseDir);
    
    return {
      success: true,
      hash: hash,
      shortHash: hash.substring(0, 8),
      ref: ref,
      refType: refType
    };
  }

  /**
   * Creates a tag for the current or specified version
   * @param {string} tagName - Tag name
   * @param {string} hash - Optional hash (defaults to latest)
   * @returns {Object} Tag creation result
   */
  tag(tagName, hash = null) {
    if (!this.isInitialized()) {
      throw new versioning.VersioningError(
        'Meta not initialized. Call init() first.',
        'NOT_INITIALIZED'
      );
    }

    versioning.createTag(tagName, hash, this.baseDir);
    
    const tagHash = hash || versioning.getLatestHash(this.baseDir);
    
    return {
      success: true,
      tag: tagName,
      hash: tagHash,
      shortHash: tagHash.substring(0, 8)
    };
  }

  /**
   * Lists all tags
   * @returns {Array<{name: string, hash: string, shortHash: string}>}
   */
  listTags() {
    return versioning.listTags(this.baseDir).map(tag => ({
      name: tag.name,
      hash: tag.hash,
      shortHash: tag.hash.substring(0, 8)
    }));
  }

  /**
   * Deletes a tag
   * @param {string} tagName - Tag name to delete
   */
  deleteTag(tagName) {
    versioning.deleteTag(tagName, this.baseDir);
  }

  /**
   * Creates a branch
   * @param {string} branchName - Branch name
   * @param {string} hash - Optional hash (defaults to latest)
   * @returns {Object} Branch creation result
   */
  createBranch(branchName, hash = null) {
    if (!this.isInitialized()) {
      throw new versioning.VersioningError(
        'Meta not initialized. Call init() first.',
        'NOT_INITIALIZED'
      );
    }

    versioning.createBranch(branchName, hash, this.baseDir);
    
    const branchHash = hash || versioning.getLatestHash(this.baseDir);
    
    return {
      success: true,
      branch: branchName,
      hash: branchHash,
      shortHash: branchHash.substring(0, 8)
    };
  }

  /**
   * Lists all branches
   * @returns {Array<{name: string, hash: string, shortHash: string}>}
   */
  listBranches() {
    return versioning.listBranches(this.baseDir).map(branch => ({
      name: branch.name,
      hash: branch.hash,
      shortHash: branch.hash.substring(0, 8)
    }));
  }

  /**
   * Gets version history
   * @param {Object} options - History options
   * @param {number} options.limit - Limit number of entries
   * @param {boolean} options.reverse - Reverse order (newest first)
   * @returns {Array} History entries
   */
  getHistory(options = {}) {
    let history = versioning.getHistory(this.baseDir);
    
    if (options.reverse !== false) {
      history = [...history].reverse();
    }
    
    if (options.limit) {
      history = history.slice(0, options.limit);
    }
    
    return history.map(entry => ({
      hash: entry.hash,
      shortHash: entry.hash.substring(0, 8),
      message: entry.message,
      timestamp: entry.timestamp,
      parent: entry.parent,
      parentShortHash: entry.parent ? entry.parent.substring(0, 8) : null
    }));
  }

  /**
   * Gets the current status
   * @returns {Object} Status information
   */
  getStatus() {
    const isInit = this.isInitialized();
    const latestHash = isInit ? versioning.getLatestHash(this.baseDir) : null;
    
    let workingHash = null;
    let hasChanges = false;
    let versionChanged = false;
    
    try {
      const workingContent = this.getWorkingConfig();
      workingHash = versioning.computeHash(workingContent);
      hasChanges = latestHash ? workingHash !== latestHash : true;
      versionChanged = this.hasVersionChanged();
    } catch (error) {
      // Config file doesn't exist or can't be read
    }
    
    return {
      initialized: isInit,
      latestHash: latestHash,
      latestShortHash: latestHash ? latestHash.substring(0, 8) : null,
      workingHash: workingHash,
      workingShortHash: workingHash ? workingHash.substring(0, 8) : null,
      hasChanges: hasChanges,
      versionChanged: versionChanged,
      configFile: this.configFile,
      configPath: this.configPath,
      configExists: fs.existsSync(this.configPath)
    };
  }

  /**
   * Computes diff between two versions
   * @param {string|null} fromHash - Source hash (null for working directory)
   * @param {string|null} toHash - Target hash (null for working directory)
   * @returns {Object} Diff result
   */
  diff(fromHash = null, toHash = null) {
    if (!this.isInitialized()) {
      throw new versioning.VersioningError(
        'Meta not initialized. Call init() first.',
        'NOT_INITIALIZED'
      );
    }

    // If toHash is null, use working directory
    if (toHash === null) {
      try {
        const workingContent = this.getWorkingConfig();
        const workingHash = versioning.computeHash(workingContent);
        toHash = workingHash;
      } catch (error) {
        // Working directory doesn't exist
      }
    }

    return versioning.computeDiff(fromHash, toHash, this.baseDir);
  }

  /**
   * Gets information about a specific version
   * @param {string} ref - Hash, tag, or branch name
   * @returns {Object} Version information
   */
  getVersionInfo(ref) {
    if (!this.isInitialized()) {
      throw new versioning.VersioningError(
        'Meta not initialized. Call init() first.',
        'NOT_INITIALIZED'
      );
    }

    let hash = ref;
    let refType = 'hash';

    // Check if it's a tag
    const tagHash = versioning.readTag(ref, this.baseDir);
    if (tagHash) {
      hash = tagHash;
      refType = 'tag';
    } else {
      // Check if it's a branch
      const branchHash = versioning.readBranch(ref, this.baseDir);
      if (branchHash) {
        hash = branchHash;
        refType = 'branch';
      }
    }

    const content = versioning.readObject(hash, this.baseDir);
    const version = this.extractVersionTag(content);
    
    // Find history entry
    const history = versioning.getHistory(this.baseDir);
    const entry = history.find(e => e.hash === hash);
    
    return {
      hash: hash,
      shortHash: hash.substring(0, 8),
      ref: ref,
      refType: refType,
      version: version,
      content: content,
      message: entry ? entry.message : null,
      timestamp: entry ? entry.timestamp : null,
      parent: entry ? entry.parent : null
    };
  }
}

module.exports = MetaSDK;

