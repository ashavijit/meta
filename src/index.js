/**
 * meta-lang SDK
 * Main entry point for the meta-lang package
 * 
 * @example
 * const { parseMeta, loadMeta, ConfigLoader, MetaSDK } = require('meta-lang');
 */

// Core parsing
const { parseMeta } = require('./parser');
const { loadMeta } = require('./loader');

// Version control
const versioning = require('./versioning');
const MetaSDK = require('./sdk');

// Production config loader (replaces .env)
const { ConfigLoader, loadConfig, ConfigError, ConfigNotFoundError } = require('./config-loader');

module.exports = {
  // Core parsing functions
  parseMeta,
  loadMeta,
  
  // Version control SDK
  MetaSDK,
  versioning,
  
  // Production config loader (replaces .env)
  ConfigLoader,
  loadConfig,
  ConfigError,
  ConfigNotFoundError
};