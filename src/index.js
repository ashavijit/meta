/**
 * Main entry point for the meta-lang package
 * Exports all public APIs for parsing and loading .meta files
 */

const { parseMeta } = require('./parser');
const { loadMeta } = require('./loader');

module.exports = {
  parseMeta,
  loadMeta
};