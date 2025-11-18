/**
 * Comprehensive tests for MetaSDK
 */

const fs = require('fs');
const path = require('path');
const MetaSDK = require('../src/sdk');

describe('MetaSDK', () => {
  const testDir = path.join(__dirname, 'test-sdk');
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
    test('should initialize SDK', () => {
      const sdk = new MetaSDK({
        baseDir: testDir,
        configFile: 'config.meta'
      });

      sdk.init();
      expect(sdk.isInitialized()).toBe(true);
    });
  });

  describe('Push', () => {
    beforeEach(() => {
      const sdk = new MetaSDK({
        baseDir: testDir,
        configFile: 'config.meta'
      });
      sdk.init();
    });

    test('should push config with @v change', () => {
      const configContent = `
@common
@v 1.0.0
name:string TestApp
`;
      fs.writeFileSync(testConfigPath, configContent);

      const sdk = new MetaSDK({
        baseDir: testDir,
        configFile: 'config.meta'
      });

      const result = sdk.push('Initial commit');
      expect(result.success).toBe(true);
      expect(result.hash).toBeDefined();
    });

    test('should skip push if @v unchanged', () => {
      const configContent = `
@common
@v 1.0.0
name:string TestApp
`;
      fs.writeFileSync(testConfigPath, configContent);

      const sdk = new MetaSDK({
        baseDir: testDir,
        configFile: 'config.meta'
      });

      sdk.push('First commit');
      const result = sdk.push('Second commit');
      
      expect(result.skipped).toBe(true);
    });
  });

  describe('Checkout', () => {
    beforeEach(() => {
      const sdk = new MetaSDK({
        baseDir: testDir,
        configFile: 'config.meta'
      });
      sdk.init();
    });

    test('should checkout by hash', () => {
      const configContent = `
@common
@v 1.0.0
name:string TestApp
`;
      fs.writeFileSync(testConfigPath, configContent);

      const sdk = new MetaSDK({
        baseDir: testDir,
        configFile: 'config.meta'
      });

      const pushResult = sdk.push('Initial commit');
      const checkoutResult = sdk.checkout(pushResult.hash);

      expect(checkoutResult.success).toBe(true);
      expect(checkoutResult.hash).toBe(pushResult.hash);
    });
  });

  describe('Tags', () => {
    beforeEach(() => {
      const sdk = new MetaSDK({
        baseDir: testDir,
        configFile: 'config.meta'
      });
      sdk.init();
    });

    test('should create tag', () => {
      const configContent = `
@common
@v 1.0.0
name:string TestApp
`;
      fs.writeFileSync(testConfigPath, configContent);

      const sdk = new MetaSDK({
        baseDir: testDir,
        configFile: 'config.meta'
      });

      sdk.push('Initial commit');
      const result = sdk.tag('v1.0.0');

      expect(result.success).toBe(true);
      expect(result.tag).toBe('v1.0.0');
    });

    test('should list tags', () => {
      const configContent = `
@common
@v 1.0.0
name:string TestApp
`;
      fs.writeFileSync(testConfigPath, configContent);

      const sdk = new MetaSDK({
        baseDir: testDir,
        configFile: 'config.meta'
      });

      sdk.push('Initial commit');
      sdk.tag('v1.0.0');
      sdk.tag('v2.0.0');

      const tags = sdk.listTags();
      expect(tags.length).toBe(2);
    });
  });

  describe('Status', () => {
    beforeEach(() => {
      const sdk = new MetaSDK({
        baseDir: testDir,
        configFile: 'config.meta'
      });
      sdk.init();
    });

    test('should get status', () => {
      const configContent = `
@common
@v 1.0.0
name:string TestApp
`;
      fs.writeFileSync(testConfigPath, configContent);

      const sdk = new MetaSDK({
        baseDir: testDir,
        configFile: 'config.meta'
      });

      const status = sdk.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.configExists).toBe(true);
    });
  });

  describe('History', () => {
    beforeEach(() => {
      const sdk = new MetaSDK({
        baseDir: testDir,
        configFile: 'config.meta'
      });
      sdk.init();
    });

    test('should get history', () => {
      const configContent1 = `
@common
@v 1.0.0
name:string TestApp
`;
      fs.writeFileSync(testConfigPath, configContent1);

      const sdk = new MetaSDK({
        baseDir: testDir,
        configFile: 'config.meta'
      });

      sdk.push('First commit');
      
      // Change @v to trigger second commit
      const configContent2 = `
@common
@v 1.0.1
name:string TestApp
`;
      fs.writeFileSync(testConfigPath, configContent2);
      sdk.push('Second commit');

      const history = sdk.getHistory();
      expect(history.length).toBe(2);
    });
  });
});

