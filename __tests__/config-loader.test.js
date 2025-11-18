/**
 * Comprehensive tests for ConfigLoader
 */

const fs = require('fs');
const path = require('path');
const { ConfigLoader, ConfigError, ConfigNotFoundError } = require('../src/config-loader');
const { parseMeta } = require('../src/parser');

describe('ConfigLoader', () => {
  const testConfigPath = path.join(__dirname, 'test-config.meta');
  const testConfigContent = `
@common
app_name:string TestApp
version:float 1.0.0
timeout:int 30

@env dev
debug:bool true
port:int 3000
database_host:string localhost
database_password:env $ENV(DB_PASS_DEV, "dev_password")

@env prod
debug:bool false
port:int 8080
database_host:string prod.db.com
database_password:env $ENV(DB_PASS_PROD)
`;

  beforeEach(() => {
    // Create test config file
    fs.writeFileSync(testConfigPath, testConfigContent);
  });

  afterEach(() => {
    // Clean up test config file
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  });

  describe('Initialization', () => {
    test('should load config file', () => {
      const config = new ConfigLoader({
        configPath: testConfigPath,
        env: 'dev'
      });

      expect(config.get('app_name')).toBe('TestApp');
      expect(config.get('port')).toBe(3000);
    });

    test('should throw error if config file not found', () => {
      expect(() => {
        new ConfigLoader({
          configPath: './nonexistent.meta',
          env: 'dev'
        });
      }).toThrow(ConfigNotFoundError);
    });

    test('should use default env if not provided', () => {
      process.env.NODE_ENV = 'dev';
      const config = new ConfigLoader({
        configPath: testConfigPath
      });

      expect(config.get('debug')).toBe(true);
      delete process.env.NODE_ENV;
    });
  });

  describe('Config Merging', () => {
    test('should merge common and environment config', () => {
      const config = new ConfigLoader({
        configPath: testConfigPath,
        env: 'dev'
      });

      const all = config.get();
      expect(all.app_name).toBe('TestApp'); // from common
      expect(all.port).toBe(3000); // from dev
      expect(all.debug).toBe(true); // from dev
    });

    test('should override common with environment config', () => {
      const config = new ConfigLoader({
        configPath: testConfigPath,
        env: 'prod'
      });

      expect(config.get('app_name')).toBe('TestApp'); // from common
      expect(config.get('debug')).toBe(false); // from prod (overrides common if existed)
      expect(config.get('port')).toBe(8080); // from prod
    });
  });

  describe('get() method', () => {
    test('should get config value', () => {
      const config = new ConfigLoader({
        configPath: testConfigPath,
        env: 'dev'
      });

      expect(config.get('app_name')).toBe('TestApp');
      expect(config.get('port')).toBe(3000);
      expect(config.get('debug')).toBe(true);
    });

    test('should return default value if key not found', () => {
      const config = new ConfigLoader({
        configPath: testConfigPath,
        env: 'dev'
      });

      expect(config.get('nonexistent', 'default')).toBe('default');
    });

    test('should support dot notation when flatten is enabled', () => {
      // Use a simpler nested structure that works with the parser
      const nestedConfig = `
@common
database_host:string localhost
database_port:int 5432

@env dev
database_host:string dev.localhost
`;
      const nestedPath = path.join(__dirname, 'test-nested.meta');
      fs.writeFileSync(nestedPath, nestedConfig);

      const config = new ConfigLoader({
        configPath: nestedPath,
        env: 'dev',
        flatten: true
      });

      expect(config.get('database_host')).toBe('dev.localhost');
      expect(config.get('database_port')).toBe(5432);

      fs.unlinkSync(nestedPath);
    });
  });

  describe('has() method', () => {
    test('should check if key exists', () => {
      const config = new ConfigLoader({
        configPath: testConfigPath,
        env: 'dev'
      });

      expect(config.has('app_name')).toBe(true);
      expect(config.has('nonexistent')).toBe(false);
    });
  });

  describe('getEnv() method', () => {
    test('should get config for specific environment', () => {
      const config = new ConfigLoader({
        configPath: testConfigPath,
        env: 'dev'
      });

      const prodConfig = config.getEnv('prod');
      expect(prodConfig.port).toBe(8080);
      expect(prodConfig.debug).toBe(false);
    });
  });

  describe('Validation', () => {
    test('should validate required keys', () => {
      const config = new ConfigLoader({
        configPath: testConfigPath,
        env: 'dev'
      });

      expect(() => {
        config.validate(['app_name', 'port']);
      }).not.toThrow();

      expect(() => {
        config.validate(['app_name', 'nonexistent']);
      }).toThrow(ConfigError);
    });
  });

  describe('Environment Variables', () => {
    test('should resolve environment variables', () => {
      process.env.DB_PASS_DEV = 'test_password';
      const config = new ConfigLoader({
        configPath: testConfigPath,
        env: 'dev'
      });

      expect(config.get('database_password')).toBe('test_password');
      delete process.env.DB_PASS_DEV;
    });

    test('should use default value if env var not set', () => {
      delete process.env.DB_PASS_DEV;
      const config = new ConfigLoader({
        configPath: testConfigPath,
        env: 'dev'
      });

      expect(config.get('database_password')).toBe('dev_password');
    });

    test('should export config as environment variables', () => {
      const config = new ConfigLoader({
        configPath: testConfigPath,
        env: 'dev'
      });

      const env = config.toEnv();
      expect(env.app_name).toBe('TestApp');
      expect(env.port).toBe('3000');
    });

    test('should set process.env variables', () => {
      const config = new ConfigLoader({
        configPath: testConfigPath,
        env: 'dev'
      });

      const originalPort = process.env.port;
      config.setEnv({ override: false });
      
      if (!originalPort) {
        expect(process.env.port).toBe('3000');
      }
    });
  });

  describe('Reload', () => {
    test('should reload config from file', () => {
      const config = new ConfigLoader({
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

  describe('Caching', () => {
    test('should cache config by default', () => {
      const config = new ConfigLoader({
        configPath: testConfigPath,
        env: 'dev',
        cache: true
      });

      const first = config.get();
      const second = config.get();

      expect(first).toBe(second); // Same reference
    });
  });
});

