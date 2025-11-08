#!/usr/bin/env node

/**
 * CLI entry point for the meta-lang package
 * Provides command-line interface for parsing .meta files
 */

const fs = require('fs');
const path = require('path');
const { loadMeta } = require('../src/index.js');

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: meta <file.meta> [options]

Options:
  --strict-env    Throw error if environment variables are missing
  --warn-missing  Warn if environment variables are missing
  --help, -h      Show this help message

Examples:
  meta config.meta
  meta config.meta --strict-env
  meta config.meta --warn-missing
  `);
  process.exit(0);
}

const filePath = args[0];

if (!fs.existsSync(filePath)) {
  console.error(`Error: File '${filePath}' not found`);
  process.exit(1);
}

const options = {};
if (args.includes('--strict-env')) {
  options.strictEnv = true;
}
if (args.includes('--warn-missing')) {
  options.warnOnMissing = true;
}

try {
  const result = loadMeta(filePath, options);
  
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}