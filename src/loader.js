/**
 * Loader module for .meta files
 * Handles loading and parsing of .meta files from the file system
 */

const fs = require('fs');
const { parseMeta } = require('./parser');

/**
 * Loads and parses a .meta file from disk
 * @param {string} path - The path to the .meta file
 * @param {Object} options - Parsing options
 * @returns {Object} - The parsed configuration object
 */
function loadMeta(path, options = {}) {
  try {
    const content = fs.readFileSync(path, 'utf8');
    
    return parseMeta(content, options);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${path}`);
    }
    throw new Error(`Error loading meta file '${path}': ${error.message}`);
  }
}

module.exports = {
  loadMeta
};