/**
 * Test suite for the environment resolver module
 */

const { EnvironmentResolver } = require('../src/environment-resolver');

describe('EnvironmentResolver', () => {
  let originalEnv;
  
  // Save original environment variables before tests
  beforeAll(() => {
    originalEnv = { ...process.env };
  });
  
  // Restore original environment variables after each test
  afterEach(() => {
    process.env = { ...originalEnv };
  });
  
  test('should resolve existing environment variables', () => {
    process.env.TEST_VAR = 'test_value';
    const resolver = new EnvironmentResolver();
    
    const result = resolver.resolve('$ENV(TEST_VAR)');
    expect(result).toBe('test_value');
  });
  
  test('should resolve environment variables with defaults', () => {
    const resolver = new EnvironmentResolver();
    
    const result = resolver.resolve('$ENV(TEST_VAR, "default_value")');
    expect(result).toBe('default_value');
  });
  
  test('should prioritize environment variables over defaults', () => {
    process.env.TEST_VAR = 'env_value';
    const resolver = new EnvironmentResolver();
    
    const result = resolver.resolve('$ENV(TEST_VAR, "default_value")');
    expect(result).toBe('env_value');
  });
  
  test('should handle missing environment variables with strict mode', () => {
    const resolver = new EnvironmentResolver({ strictEnv: true });
    
    expect(() => {
      resolver.resolve('$ENV(MISSING_VAR)');
    }).toThrow();
  });
  
  test('should handle missing environment variables with warn mode', () => {
    const resolver = new EnvironmentResolver({ warnOnMissing: true });
    
    // Mock console.warn to verify it's called
    const originalWarn = console.warn;
    console.warn = jest.fn();
    
    const result = resolver.resolve('$ENV(MISSING_VAR)');
    expect(result).toBe('');
    expect(console.warn).toHaveBeenCalled();
    
    // Restore console.warn
    console.warn = originalWarn;
  });
});