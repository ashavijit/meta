/**
 * Environment variable resolver for .meta files
 * Handles resolution of $ENV(...) expressions
 */

class EnvironmentResolver {

  constructor(options = {}) {
    this.options = options;
  }
  

  resolve(expr) {
    if (!expr.startsWith('$ENV(') || !expr.endsWith(')')) {
      throw new Error(`Invalid environment variable expression: ${expr}`);
    }
    
    const content = expr.substring(5, expr.length - 1);
    
    const parts = content.split(',');
    const varName = parts[0].trim();
    const defaultValue = parts.length > 1 ? this.parseDefaultValue(parts[1].trim()) : undefined;
    
    const envValue = process.env[varName];
    
    if (envValue !== undefined) {
      return envValue;
    }
    
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    
    if (this.options.strictEnv) {
      throw new Error(`Environment variable '${varName}' is not defined and no default provided`);
    }
    
    if (this.options.warnOnMissing) {
      console.warn(`Warning: Environment variable '${varName}' is not defined and no default provided`);
    }
    
    return '';
  }
  
  /**
   * Parses a default value string
   * @param {string} value - The default value string (with quotes)
   * @returns {string} - The parsed default value
   */
  parseDefaultValue(value) {
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.substring(1, value.length - 1);
    }
    return value;
  }
}

module.exports = {
  EnvironmentResolver
};