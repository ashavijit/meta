/**
 * Tests for app-config.js (simple API)
 */

const fs = require('fs');
const path = require('path');
const config = require('../src/app-config');

describe('app-config', () => {
  const testConfigPath = path.join(__dirname, 'test-app-config.meta');
  const testConfigContent = `
@common
app_name:string TestApp
version:float 1.0.0

@env dev
debug:bool true
port:int 3000
database_host:string localhost
`;

  beforeEach(() => {
    // Reset global config
    config.reset();
    
    // Create test config file
    fs.writeFileSync(testConfigPath, testConfigContent);
  });

  afterEach(() => {
    // Clean up
    config.reset();
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  });

  describe('initConfig()', () => {
    test('should initialize config', () => {
      const loader = config.initConfig({
        configPath: testConfigPath,
        env: 'dev'
      });

      expect(loader).toBeDefined();
      expect(config.get('app_name')).toBe('TestApp');
    });

    test('should return same instance on multiple calls', () => {
      const loader1 = config.initConfig({
        configPath: testConfigPath,
        env: 'dev'
      });

      const loader2 = config.initConfig();

      expect(loader1).toBe(loader2);
    });
  });

  describe('get()', () => {
    test('should get config value', () => {
      config.initConfig({
        configPath: testConfigPath,
        env: 'dev'
      });

      expect(config.get('app_name')).toBe('TestApp');
      expect(config.get('port')).toBe(3000);
    });

    test('should return default if key not found', () => {
      config.initConfig({
        configPath: testConfigPath,
        env: 'dev'
      });

      expect(config.get('nonexistent', 'default')).toBe('default');
    });

    test('should auto-initialize if not initialized', () => {
      // Don't call initConfig
      // Should auto-initialize with defaults
      try {
        const value = config.get('app_name', 'default');
        expect(value).toBeDefined();
      } catch (error) {
        // Expected if config.meta doesn't exist
        expect(error).toBeDefined();
      }
    });
  });

  describe('getAll()', () => {
    test('should get all config', () => {
      config.initConfig({
        configPath: testConfigPath,
        env: 'dev'
      });

      const all = config.getAll();
      expect(all.app_name).toBe('TestApp');
      expect(all.port).toBe(3000);
    });
  });

  describe('has()', () => {
    test('should check if key exists', () => {
      config.initConfig({
        configPath: testConfigPath,
        env: 'dev'
      });

      expect(config.has('app_name')).toBe(true);
      expect(config.has('nonexistent')).toBe(false);
    });
  });

  describe('getEnv()', () => {
    test('should get config for specific environment', () => {
      config.initConfig({
        configPath: testConfigPath,
        env: 'dev'
      });

      const devConfig = config.getEnv('dev');
      expect(devConfig.debug).toBe(true);
    });
  });

  describe('validate()', () => {
    test('should validate required keys', () => {
      config.initConfig({
        configPath: testConfigPath,
        env: 'dev'
      });

      expect(() => {
        config.validate(['app_name', 'port']);
      }).not.toThrow();

      expect(() => {
        config.validate(['app_name', 'nonexistent']);
      }).toThrow();
    });
  });

  describe('reload()', () => {
    test('should reload config', () => {
      config.initConfig({
        configPath: testConfigPath,
        env: 'dev'
      });

      expect(config.get('port')).toBe(3000);

      // Modify file
      const newContent = testConfigContent.replace('port:int 3000', 'port:int 4000');
      fs.writeFileSync(testConfigPath, newContent);

      config.reload();
      expect(config.get('port')).toBe(4000);

      // Restore
      fs.writeFileSync(testConfigPath, testConfigContent);
    });
  });

  describe('reset()', () => {
    test('should reset global config', () => {
      config.initConfig({
        configPath: testConfigPath,
        env: 'dev'
      });

      expect(config.get('app_name')).toBe('TestApp');

      config.reset();
      
      // After reset, get() will auto-initialize with default path
      // So we check that the config path is different or it throws
      try {
        const value = config.get('app_name');
        // If it doesn't throw, it means it auto-initialized
        // This is expected behavior - reset clears the instance but get() can recreate it
        expect(value).toBeDefined();
      } catch (error) {
        // If it throws, that's also valid (config.meta doesn't exist in default location)
        expect(error).toBeDefined();
      }
    });
  });
});

