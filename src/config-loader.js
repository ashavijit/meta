/**
 * Production-ready config loader for Node.js applications
 * Replaces .env files with .meta configuration files
 * Provides dotenv-like API with enhanced features
 */

const fs = require('fs');
const path = require('path');
const { parseMeta } = require('./parser');

/**
 * Custom error classes
 */
class ConfigError extends Error {
  constructor(message, code = 'CONFIG_ERROR') {
    super(message);
    this.name = 'ConfigError';
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ConfigNotFoundError extends ConfigError {
  constructor(path) {
    super(`Config file not found: ${path}`, 'CONFIG_NOT_FOUND');
    this.path = path;
  }
}

/**
 * Production-ready config loader class
 * Provides easy access to configuration with environment merging
 */
class ConfigLoader {
  /**
   * Creates a new ConfigLoader instance
   * @param {Object} options - Loader options
   * @param {string} options.configPath - Path to config.meta file (defaults to './config.meta')
   * @param {string} options.env - Environment name (defaults to process.env.NODE_ENV or 'dev')
   * @param {boolean} options.strictEnv - Throw error if env vars are missing
   * @param {boolean} options.warnOnMissing - Warn if env vars are missing
   * @param {boolean} options.validateRequired - Validate required fields
   * @param {boolean} options.flatten - Flatten nested config to dot notation
   * @param {boolean} options.cache - Cache parsed config (default: true)
   * @param {boolean} options.watch - Watch for file changes and reload (default: false)
   */
  constructor(options = {}) {
    this.configPath = options.configPath || path.join(process.cwd(), 'config.meta');
    this.env = options.env || process.env.NODE_ENV || 'dev';
    this.strictEnv = options.strictEnv || false;
    this.warnOnMissing = options.warnOnMissing || false;
    this.validateRequired = options.validateRequired || false;
    this.flatten = options.flatten || false;
    this.cache = options.cache !== false;
    this.watch = options.watch || false;
    
    this._config = null;
    this._rawConfig = null;
    this._watcher = null;
    
    // Auto-load config
    this.load();
    
    // Setup file watcher if enabled
    if (this.watch) {
      this._setupWatcher();
    }
  }

  /**
   * Loads and parses the config file
   * @returns {Object} Parsed configuration
   * @throws {ConfigNotFoundError} If config file doesn't exist
   */
  load() {
    if (!fs.existsSync(this.configPath)) {
      throw new ConfigNotFoundError(this.configPath);
    }

    try {
      const content = fs.readFileSync(this.configPath, 'utf8');
      this._rawConfig = parseMeta(content, {
        strictEnv: this.strictEnv,
        warnOnMissing: this.warnOnMissing,
        validateRequired: this.validateRequired
      });

      // Merge common + environment config
      this._config = this._mergeConfig(this._rawConfig);

      // Flatten if requested
      if (this.flatten) {
        this._config = this._flattenConfig(this._config);
      }

      return this._config;
    } catch (error) {
      if (error instanceof ConfigNotFoundError) {
        throw error;
      }
      throw new ConfigError(
        `Failed to load config from '${this.configPath}': ${error.message}`,
        'LOAD_FAILED'
      );
    }
  }

  /**
   * Merges common and environment-specific config
   * @param {Object} rawConfig - Raw parsed config
   * @returns {Object} Merged configuration
   */
  _mergeConfig(rawConfig) {
    const merged = {};
    
    // Start with common config
    if (rawConfig.common) {
      Object.assign(merged, rawConfig.common);
    }
    
    // Override with environment-specific config
    if (rawConfig[this.env]) {
      Object.assign(merged, rawConfig[this.env]);
    }
    
    // Include other sections (non-env, non-common, non-@ sections)
    // Only include sections that are not environment names
    const envNames = Object.keys(rawConfig).filter(key => 
      key !== 'common' && 
      !key.startsWith('@') &&
      typeof rawConfig[key] === 'object' &&
      rawConfig[key] !== null
    );
    
    // Check if a key is an environment name by seeing if it's in rawConfig
    // and is an object (not a primitive value)
    for (const [key, value] of Object.entries(rawConfig)) {
      if (key !== 'common' && 
          key !== this.env && 
          !key.startsWith('@') &&
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value)) {
        // Only include if it's not another environment section
        // We can check this by seeing if it looks like an env section
        // (has typical env keys like debug, port, etc. or is explicitly not an env)
        const isEnvSection = envNames.includes(key) && key !== this.env;
        if (!isEnvSection) {
          merged[key] = value;
        }
      }
    }
    
    return merged;
  }

  /**
   * Flattens nested config to dot notation
   * @param {Object} config - Config object
   * @param {string} prefix - Key prefix
   * @returns {Object} Flattened config
   */
  _flattenConfig(config, prefix = '') {
    const flattened = {};
    
    for (const [key, value] of Object.entries(config)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(flattened, this._flattenConfig(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    }
    
    return flattened;
  }

  /**
   * Gets the full configuration object or a value by key
   * @param {string} key - Optional config key (supports dot notation like 'database.host')
   * @param {*} defaultValue - Default value if key not found
   * @returns {Object|*} Configuration object or config value
   */
  get(key, defaultValue = undefined) {
    if (!this.cache || !this._config) {
      this.load();
    }
    
    // If no key provided, return full config
    if (key === undefined) {
      return this._config;
    }
    
    if (typeof key !== 'string') {
      throw new ConfigError('Key must be a string', 'INVALID_KEY');
    }

    const config = this._config;
    
    // Support dot notation
    if (key.includes('.')) {
      const keys = key.split('.');
      let value = config;
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return defaultValue;
        }
      }
      
      return value;
    }
    
    return key in config ? config[key] : defaultValue;
  }

  /**
   * Checks if a config key exists
   * @param {string} key - Config key
   * @returns {boolean} True if key exists
   */
  has(key) {
    return this.get(key) !== undefined;
  }

  /**
   * Gets all config keys
   * @returns {string[]} Array of config keys
   */
  keys() {
    return Object.keys(this.get());
  }

  /**
   * Gets config for a specific environment
   * @param {string} env - Environment name
   * @returns {Object} Environment-specific config
   */
  getEnv(env) {
    const originalEnv = this.env;
    this.env = env;
    const config = this.load();
    this.env = originalEnv;
    return config;
  }

  /**
   * Gets raw config (before merging)
   * @returns {Object} Raw configuration
   */
  getRaw() {
    if (!this.cache || !this._rawConfig) {
      this.load();
    }
    return this._rawConfig;
  }

  /**
   * Reloads config from file
   * @returns {Object} Reloaded configuration
   */
  reload() {
    this._config = null;
    this._rawConfig = null;
    return this.load();
  }

  /**
   * Sets up file watcher for auto-reload
   * @private
   */
  _setupWatcher() {
    if (this._watcher) {
      this._watcher.close();
    }

    try {
      this._watcher = fs.watch(this.configPath, (eventType) => {
        if (eventType === 'change') {
          try {
            this.reload();
            if (this.onReload) {
              this.onReload(this.get());
            }
          } catch (error) {
            if (this.onError) {
              this.onError(error);
            }
          }
        }
      });
    } catch (error) {
      // File watching not available (e.g., in some environments)
      if (this.onError) {
        this.onError(new ConfigError(`File watching not available: ${error.message}`, 'WATCH_FAILED'));
      }
    }
  }

  /**
   * Stops watching for file changes
   */
  stopWatching() {
    if (this._watcher) {
      this._watcher.close();
      this._watcher = null;
    }
  }

  /**
   * Validates required config keys
   * @param {string[]} requiredKeys - Array of required keys
   * @throws {ConfigError} If any required key is missing
   */
  validate(requiredKeys) {
    const missing = [];
    
    for (const key of requiredKeys) {
      if (!this.has(key)) {
        missing.push(key);
      }
    }
    
    if (missing.length > 0) {
      throw new ConfigError(
        `Missing required config keys: ${missing.join(', ')}`,
        'VALIDATION_FAILED'
      );
    }
  }

  /**
   * Exports config as environment variables (dotenv-like)
   * @returns {Object} Environment variables object
   */
  toEnv() {
    const config = this.get(); // Get full config
    const env = {};
    
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
        // Flatten nested objects
        const flattened = this._flattenConfig({ [key]: value });
        Object.assign(env, flattened);
      } else {
        env[key] = String(value);
      }
    }
    
    return env;
  }

  /**
   * Sets environment variables from config (dotenv-like)
   * @param {Object} options - Options
   * @param {boolean} options.override - Override existing env vars (default: false)
   */
  setEnv(options = {}) {
    const env = this.toEnv();
    const override = options.override || false;
    
    for (const [key, value] of Object.entries(env)) {
      if (override || !(key in process.env)) {
        process.env[key] = value;
      }
    }
  }

  /**
   * Gets config as JSON string
   * @param {number} indent - JSON indentation
   * @returns {string} JSON string
   */
  toJSON(indent = 2) {
    return JSON.stringify(this.get(), null, indent);
  }

  /**
   * Destroys the loader and cleans up resources
   */
  destroy() {
    this.stopWatching();
    this._config = null;
    this._rawConfig = null;
  }
}

/**
 * Convenience function to create and load config
 * @param {Object} options - Loader options
 * @returns {ConfigLoader} Config loader instance
 */
function loadConfig(options = {}) {
  return new ConfigLoader(options);
}

module.exports = {
  ConfigLoader,
  ConfigError,
  ConfigNotFoundError,
  loadConfig
};

