/**
 * Type converter module for .meta files
 * Handles conversion of parsed values to their appropriate JavaScript types
 */

class TypeConverter {
  /**
   * Converts a value string to the specified type
   * @param {string} type - The target type (string, int, float, bool, list, map, env)
   * @param {string} value - The value to convert
   * @param {EnvironmentResolver} envResolver - Environment variable resolver
   * @returns {*} - The converted value
   */
  convert(type, value, envResolver) {
    switch (type.toLowerCase()) {
      case 'string':
        return this.convertString(value, envResolver);
      case 'int':
        return this.convertInt(value, envResolver);
      case 'float':
        return this.convertFloat(value, envResolver);
      case 'bool':
        return this.convertBool(value, envResolver);
      case 'list':
        return this.convertList(value, envResolver);
      case 'map':
        return this.convertMap(value, envResolver);
      case 'env':
        return this.convertEnv(value, envResolver);
      default:
        throw new Error(`Unsupported type: ${type}`);
    }
  }
  
  /**
   * Converts a value to a string
   */
  convertString(value, envResolver) {
    // If it's an environment variable, resolve it
    if (typeof value === 'string' && value.startsWith('$ENV(')) {
      return envResolver.resolve(value);
    }
    return value.toString();
  }
  
  /**
   * Converts a value to an integer
   */
  convertInt(value, envResolver) {
    if (typeof value === 'string' && value.startsWith('$ENV(')) {
      const resolved = envResolver.resolve(value);
      const parsed = parseInt(resolved, 10);
      if (isNaN(parsed)) {
        throw new Error(`Cannot convert '${resolved}' to integer`);
      }
      return parsed;
    }
    
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Cannot convert '${value}' to integer`);
    }
    return parsed;
  }
  
  /**
   * Converts a value to a float
   */
  convertFloat(value, envResolver) {
    if (typeof value === 'string' && value.startsWith('$ENV(')) {
      const resolved = envResolver.resolve(value);
      const parsed = parseFloat(resolved);
      if (isNaN(parsed)) {
        throw new Error(`Cannot convert '${resolved}' to float`);
      }
      return parsed;
    }
    
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      throw new Error(`Cannot convert '${value}' to float`);
    }
    return parsed;
  }
  
  /**
   * Converts a value to a boolean
   */
  convertBool(value, envResolver) {
    if (typeof value === 'string' && value.startsWith('$ENV(')) {
      const resolved = envResolver.resolve(value);
      return this.parseBool(resolved);
    }
    
    return this.parseBool(value);
  }
  
  /**
   * Parses a string to a boolean
   */
  parseBool(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true') return true;
      if (lower === 'false') return false;
    }
    throw new Error(`Cannot convert '${value}' to boolean`);
  }
  
  /**
   * Converts a value to a list
   */
  convertList(value, envResolver) {
    if (typeof value === 'string' && value.startsWith('$ENV(')) {
      const resolved = envResolver.resolve(value);
      if (resolved.startsWith('[') && resolved.endsWith(']')) {
        try {
          return JSON.parse(resolved);
        } catch (e) {
          return [resolved];
        }
      }
      return [resolved];
    }
    
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const content = trimmed.substring(1, trimmed.length - 1);
        if (content.trim() === '') return [];
        
        return content.split(',').map(item => {
          const trimmedItem = item.trim();
          if ((trimmedItem.startsWith('"') && trimmedItem.endsWith('"')) ||
              (trimmedItem.startsWith("'") && trimmedItem.endsWith("'"))) {
            return trimmedItem.substring(1, trimmedItem.length - 1);
          }
          return trimmedItem;
        });
      }
    }
    return Array.isArray(value) ? value : [value];
  }
  
  /**
   * Converts a value to a map (object)
   */
  convertMap(value, envResolver) {
    return typeof value === 'object' ? value : {};
  }
  
  /**
   * Converts a value that should come from environment variables
   */
  convertEnv(value, envResolver) {
    if (typeof value === 'string' && value.startsWith('$ENV(')) {
      return envResolver.resolve(value);
    }
    return value;
  }
}

module.exports = {
  TypeConverter
};