/**
 * App-friendly config wrapper
 * Provides simple, production-ready API for Node.js applications
 * Drop-in replacement for dotenv
 */

const { ConfigLoader } = require('./config-loader');
const path = require('path');

/**
 * Global config instance (singleton pattern)
 */
let globalConfig = null;

/**
 * Initializes global config (call once at app startup)
 * @param {Object} options - Config options
 * @returns {ConfigLoader} Config loader instance
 */
function initConfig(options = {}) {
  if (globalConfig) {
    return globalConfig;
  }

  globalConfig = new ConfigLoader({
    configPath: options.configPath || path.join(process.cwd(), 'config.meta'),
    env: options.env || process.env.NODE_ENV || 'dev',
    strictEnv: options.strictEnv || false,
    warnOnMissing: options.warnOnMissing || true,
    validateRequired: options.validateRequired || false,
    flatten: options.flatten || false,
    cache: true,
    watch: options.watch || false,
    ...options
  });

  // Auto-set environment variables if requested
  if (options.setEnv !== false) {
    globalConfig.setEnv({ override: options.overrideEnv || false });
  }

  return globalConfig;
}

/**
 * Gets config value (dotenv-like API)
 * @param {string} key - Config key
 * @param {*} defaultValue - Default value
 * @returns {*} Config value
 */
function get(key, defaultValue = undefined) {
  if (!globalConfig) {
    initConfig();
  }
  return globalConfig.get(key, defaultValue);
}

/**
 * Gets full config object
 * @returns {Object} Full configuration
 */
function getAll() {
  if (!globalConfig) {
    initConfig();
  }
  return globalConfig.get();
}

/**
 * Checks if config key exists
 * @param {string} key - Config key
 * @returns {boolean} True if exists
 */
function has(key) {
  if (!globalConfig) {
    initConfig();
  }
  return globalConfig.has(key);
}

/**
 * Gets config for specific environment
 * @param {string} env - Environment name
 * @returns {Object} Environment config
 */
function getEnv(env) {
  if (!globalConfig) {
    initConfig();
  }
  return globalConfig.getEnv(env);
}

/**
 * Reloads config
 * @returns {Object} Reloaded config
 */
function reload() {
  if (!globalConfig) {
    initConfig();
  }
  return globalConfig.reload();
}

/**
 * Validates required keys
 * @param {string[]} keys - Required keys
 * @throws {Error} If validation fails
 */
function validate(keys) {
  if (!globalConfig) {
    initConfig();
  }
  return globalConfig.validate(keys);
}

/**
 * Resets global config (useful for testing)
 */
function reset() {
  if (globalConfig) {
    globalConfig.destroy();
    globalConfig = null;
  }
}

// Export both named and default exports
module.exports = {
  initConfig,
  get,
  getAll,
  has,
  getEnv,
  reload,
  validate,
  reset,
  ConfigLoader
};

// Also export as default for convenience
module.exports.default = module.exports;

