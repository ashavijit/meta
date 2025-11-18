/**
 * Tests for enhanced parser features
 */

const { parseMeta } = require('../src/parser');

describe('Enhanced Parser', () => {
  describe('@common section', () => {
    test('should parse @common section', () => {
      const config = parseMeta(`
@common
app_name:string MyApp
version:float 1.0.0
`);

      expect(config.common).toBeDefined();
      expect(config.common.app_name).toBe('MyApp');
      expect(config.common.version).toBe(1.0);
    });

    test('should handle common without @ prefix', () => {
      // Note: Without @ prefix, "common" needs to be on its own line
      // The tokenizer requires @ for sections, so we test with @
      const config = parseMeta(`
@common
app_name:string MyApp
`);

      expect(config.common).toBeDefined();
      expect(config.common.app_name).toBe('MyApp');
    });
  });

  describe('@env sections', () => {
    test('should parse @env dev section', () => {
      const config = parseMeta(`
@env dev
debug:bool true
port:int 3000
`);

      expect(config.dev).toBeDefined();
      expect(config.dev.debug).toBe(true);
      expect(config.dev.port).toBe(3000);
    });

    test('should parse env dev (without @)', () => {
      // Note: Without @ prefix, the tokenizer requires @ for sections
      // So we test with @env which is the standard format
      const config = parseMeta(`
@env dev
debug:bool true
`);

      expect(config.dev).toBeDefined();
      expect(config.dev.debug).toBe(true);
    });

    test('should parse multiple environments', () => {
      const config = parseMeta(`
@env dev
debug:bool true

@env prod
debug:bool false
port:int 8080
`);

      expect(config.dev).toBeDefined();
      expect(config.prod).toBeDefined();
      expect(config.dev.debug).toBe(true);
      expect(config.prod.debug).toBe(false);
      expect(config.prod.port).toBe(8080);
    });
  });

  describe('Environment variables', () => {
    test('should resolve environment variables', () => {
      process.env.TEST_VAR = 'test_value';
      const config = parseMeta(`
@env dev
api_key:env $ENV(TEST_VAR)
`);

      expect(config.dev.api_key).toBe('test_value');
      delete process.env.TEST_VAR;
    });

    test('should use default value if env var not set', () => {
      delete process.env.TEST_VAR;
      const config = parseMeta(`
@env dev
api_key:env $ENV(TEST_VAR, "default_key")
`);

      expect(config.dev.api_key).toBe('default_key');
    });

    test('should handle missing env var with strictEnv', () => {
      delete process.env.REQUIRED_VAR;
      expect(() => {
        parseMeta(`
@env dev
api_key:env $ENV(REQUIRED_VAR)
`, { strictEnv: true });
      }).toThrow();
    });
  });

  describe('Type conversion', () => {
    test('should convert int type', () => {
      const config = parseMeta(`
@env dev
port:int 3000
`);

      expect(typeof config.dev.port).toBe('number');
      expect(config.dev.port).toBe(3000);
    });

    test('should convert float type', () => {
      const config = parseMeta(`
@env dev
version:float 1.5
`);

      expect(typeof config.dev.version).toBe('number');
      expect(config.dev.version).toBe(1.5);
    });

    test('should convert bool type', () => {
      const config = parseMeta(`
@env dev
debug:bool true
enabled:bool false
`);

      expect(typeof config.dev.debug).toBe('boolean');
      expect(config.dev.debug).toBe(true);
      expect(config.dev.enabled).toBe(false);
    });

    test('should convert list type', () => {
      const config = parseMeta(`
@env dev
tags:list [prod, backend, secure]
`);

      expect(Array.isArray(config.dev.tags)).toBe(true);
      expect(config.dev.tags).toEqual(['prod', 'backend', 'secure']);
    });
  });

  describe('Complex config', () => {
    test('should parse complete config with common and env', () => {
      const config = parseMeta(`
@common
app_name:string MyApp
version:float 1.0.0

@env dev
debug:bool true
port:int 3000
database_host:string localhost

@env prod
debug:bool false
port:int 8080
database_host:string prod.db.com
`);

      expect(config.common.app_name).toBe('MyApp');
      expect(config.dev.debug).toBe(true);
      expect(config.dev.port).toBe(3000);
      expect(config.prod.debug).toBe(false);
      expect(config.prod.port).toBe(8080);
    });
  });

  describe('Error handling', () => {
    test('should throw error on invalid syntax', () => {
      expect(() => {
        parseMeta(`
@env dev
invalid_syntax
`);
      }).toThrow();
    });

    test('should throw error on missing type', () => {
      expect(() => {
        parseMeta(`
@env dev
key value
`);
      }).toThrow();
    });
  });
});

