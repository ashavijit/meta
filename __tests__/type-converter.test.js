/**
 * Test suite for the type converter module
 */

const { TypeConverter } = require('../src/type-converter');
const { EnvironmentResolver } = require('../src/environment-resolver');

describe('TypeConverter', () => {
  let converter;
  let envResolver;
  
  beforeEach(() => {
    converter = new TypeConverter();
    envResolver = new EnvironmentResolver();
  });
  
  test('should convert string values', () => {
    const result = converter.convert('string', 'test', envResolver);
    expect(result).toBe('test');
  });
  
  test('should convert integer values', () => {
    const result = converter.convert('int', '42', envResolver);
    expect(result).toBe(42);
  });
  
  test('should convert float values', () => {
    const result = converter.convert('float', '3.14', envResolver);
    expect(result).toBe(3.14);
  });
  
  test('should convert boolean values', () => {
    expect(converter.convert('bool', 'true', envResolver)).toBe(true);
    expect(converter.convert('bool', 'false', envResolver)).toBe(false);
  });
  
  test('should convert list values', () => {
    const result = converter.convert('list', '[a, b, c]', envResolver);
    expect(result).toEqual(['a', 'b', 'c']);
  });
  
  test('should convert map values', () => {
    const result = converter.convert('map', {}, envResolver);
    expect(result).toEqual({});
  });
  
  test('should throw error for invalid integer', () => {
    expect(() => {
      converter.convert('int', 'not-a-number', envResolver);
    }).toThrow();
  });
  
  test('should throw error for invalid float', () => {
    expect(() => {
      converter.convert('float', 'not-a-number', envResolver);
    }).toThrow();
  });
  
  test('should throw error for invalid boolean', () => {
    expect(() => {
      converter.convert('bool', 'not-a-boolean', envResolver);
    }).toThrow();
  });
});