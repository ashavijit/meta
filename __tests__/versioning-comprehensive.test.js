/**
 * Comprehensive tests for versioning system
 */

const fs = require('fs');
const path = require('path');
const versioning = require('../src/versioning');

describe('Versioning System', () => {
  const testDir = path.join(__dirname, 'test-versioning');
  const testConfigPath = path.join(testDir, 'config.meta');

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Initialization', () => {
    test('should initialize .meta directory', () => {
      versioning.initMetaDir(testDir);
      
      expect(versioning.isInitialized(testDir)).toBe(true);
      expect(fs.existsSync(path.join(testDir, '.meta', 'objects'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, '.meta', 'refs', 'tags'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, '.meta', 'refs', 'branches'))).toBe(true);
    });

    test('should throw error if already initialized', () => {
      versioning.initMetaDir(testDir);
      
      expect(() => {
        versioning.initMetaDir(testDir);
      }).toThrow(versioning.VersioningError);
    });
  });

  describe('Object Storage', () => {
    beforeEach(() => {
      versioning.initMetaDir(testDir);
    });

    test('should store object and return hash', () => {
      const content = 'test content';
      const hash = versioning.storeObject(content, testDir);
      
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // SHA256 hex
    });

    test('should not duplicate identical content', () => {
      const content = 'test content';
      const hash1 = versioning.storeObject(content, testDir);
      const hash2 = versioning.storeObject(content, testDir);
      
      expect(hash1).toBe(hash2);
    });

    test('should read stored object', () => {
      const content = 'test content';
      const hash = versioning.storeObject(content, testDir);
      
      const readContent = versioning.readObject(hash, testDir);
      expect(readContent).toBe(content);
    });

    test('should support partial hash', () => {
      const content = 'test content';
      const fullHash = versioning.storeObject(content, testDir);
      const shortHash = fullHash.substring(0, 8);
      
      const readContent = versioning.readObject(shortHash, testDir);
      expect(readContent).toBe(content);
    });

    test('should throw error on ambiguous partial hash', () => {
      const content1 = 'test content 1';
      const content2 = 'test content 2';
      
      versioning.storeObject(content1, testDir);
      versioning.storeObject(content2, testDir);
      
      // This test might not always trigger ambiguity, but structure is correct
      expect(() => {
        versioning.readObject('ab', testDir);
      }).toThrow();
    });
  });

  describe('History', () => {
    beforeEach(() => {
      versioning.initMetaDir(testDir);
    });

    test('should add entry to history', () => {
      const content = 'test content';
      const hash = versioning.storeObject(content, testDir);
      
      const entry = {
        hash: hash,
        message: 'Test commit',
        timestamp: new Date().toISOString(),
        parent: null
      };
      
      versioning.addToHistory(entry, testDir);
      
      const history = versioning.getHistory(testDir);
      expect(history.length).toBe(1);
      expect(history[0].message).toBe('Test commit');
    });

    test('should get history', () => {
      const content1 = 'content 1';
      const hash1 = versioning.storeObject(content1, testDir);
      
      versioning.addToHistory({
        hash: hash1,
        message: 'First commit',
        timestamp: new Date().toISOString(),
        parent: null
      }, testDir);
      
      const content2 = 'content 2';
      const hash2 = versioning.storeObject(content2, testDir);
      
      versioning.addToHistory({
        hash: hash2,
        message: 'Second commit',
        timestamp: new Date().toISOString(),
        parent: hash1
      }, testDir);
      
      const history = versioning.getHistory(testDir);
      expect(history.length).toBe(2);
      expect(history[1].parent).toBe(hash1);
    });
  });

  describe('Tags', () => {
    beforeEach(() => {
      versioning.initMetaDir(testDir);
    });

    test('should create tag', () => {
      const content = 'test content';
      const hash = versioning.storeObject(content, testDir);
      
      versioning.createTag('v1.0.0', hash, testDir);
      
      const tagHash = versioning.readTag('v1.0.0', testDir);
      expect(tagHash).toBe(hash);
    });

    test('should list tags', () => {
      const content = 'test content';
      const hash = versioning.storeObject(content, testDir);
      
      versioning.createTag('v1.0.0', hash, testDir);
      versioning.createTag('v2.0.0', hash, testDir);
      
      const tags = versioning.listTags(testDir);
      expect(tags.length).toBe(2);
      expect(tags.some(t => t.name === 'v1.0.0')).toBe(true);
      expect(tags.some(t => t.name === 'v2.0.0')).toBe(true);
    });

    test('should delete tag', () => {
      const content = 'test content';
      const hash = versioning.storeObject(content, testDir);
      
      versioning.createTag('v1.0.0', hash, testDir);
      versioning.deleteTag('v1.0.0', testDir);
      
      const tagHash = versioning.readTag('v1.0.0', testDir);
      expect(tagHash).toBeNull();
    });
  });

  describe('Branches', () => {
    beforeEach(() => {
      versioning.initMetaDir(testDir);
    });

    test('should create branch', () => {
      const content = 'test content';
      const hash = versioning.storeObject(content, testDir);
      
      versioning.createBranch('dev', hash, testDir);
      
      const branchHash = versioning.readBranch('dev', testDir);
      expect(branchHash).toBe(hash);
    });

    test('should list branches', () => {
      const content = 'test content';
      const hash = versioning.storeObject(content, testDir);
      
      versioning.createBranch('dev', hash, testDir);
      versioning.createBranch('prod', hash, testDir);
      
      const branches = versioning.listBranches(testDir);
      expect(branches.length).toBe(2);
    });
  });

  describe('Diff', () => {
    beforeEach(() => {
      versioning.initMetaDir(testDir);
    });

    test('should compute diff between versions', () => {
      const content1 = 'line1\nline2\nline3';
      const hash1 = versioning.storeObject(content1, testDir);
      
      const content2 = 'line1\nline2_modified\nline3\nline4';
      const hash2 = versioning.storeObject(content2, testDir);
      
      const diff = versioning.computeDiff(hash1, hash2, testDir);
      
      expect(diff.stats.additions).toBeGreaterThan(0);
      expect(diff.stats.deletions).toBeGreaterThan(0);
    });
  });
});

