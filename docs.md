# meta-lang Developer Reference

A human-friendly, typed, and comment-supported configuration language for modern developers.

## Table of Contents
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Syntax Overview](#syntax-overview)
- [Data Types](#data-types)
- [Sections](#sections)
- [Environment Variables](#environment-variables)
- [Multi-Environment Configuration](#multi-environment-configuration)
- [Template Generation](#template-generation)
- [API Reference](#api-reference)
- [CLI Usage](#cli-usage)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Error Handling](#error-handling)

## Installation

```bash
npm install meta-lang
```

Or globally for CLI usage:

```bash
npm install -g meta-lang
```

## Basic Usage

### JavaScript API

```javascript
const { loadMeta, parseMeta } = require('meta-lang');

// Load from file
const config = loadMeta('./config.meta');

// Parse string directly
const config = parseMeta(`
@app
name:string MyApp
version:float 1.0
`);
```

### CLI

```bash
# Parse file and output JSON
meta config.meta

# Load specific environment
meta load --env prod

# Generate application template
meta generate app
```

## Syntax Overview

The `.meta` syntax is designed to be clean and readable:

```meta
# Comments start with #
@section_name
key:type value
```

Example:
```meta
# Application settings
@app
name:string MyApplication
version:float 1.2
debug:bool true
tags:list [web, api, node]
```

## Data Types

| Type | Example | JavaScript Output |
|------|---------|-------------------|
| `string` | `name:string "My App"` | `"My App"` |
| `int` | `port:int 8080` | `8080` |
| `float` | `version:float 1.25` | `1.25` |
| `bool` | `debug:bool true` | `true` |
| `list` | `tags:list [a, b, c]` | `["a", "b", "c"]` |
| `map` | `database:map` | `{}` |
| `env` | `password:env $ENV(PASS)` | value from environment |

## Sections

Group related configuration using `@section`:

```meta
# Database configuration
@database
host:string localhost
port:int 5432

# Cache configuration
@cache
enabled:bool true
```

Access in JavaScript:
```javascript
const config = loadMeta('./config.meta');
console.log(config.database.host); // localhost
console.log(config.cache.enabled); // true
```

## Environment Variables

Reference environment variables with optional fallbacks:

```meta
# With fallback
db_user:string $ENV(DB_USER, "default_user")

# Without fallback
db_pass:env $ENV(DB_PASS)

# In lists
api_keys:list [$ENV(API_KEY1), $ENV(API_KEY2, "default")]
```

## Multi-Environment Configuration

Define multiple environments in a single file:

```meta
# Common settings
@common
app_name:string MyApp
version:float 2.0

# Development
@env dev
database_host:string localhost
database_port:int 5432

# Production
@env prod
database_host:string prod.db.company.com
database_port:int 5432
```

Load specific environment:
```bash
# CLI
meta load --env prod

# JavaScript
node index.js --env prod
```

## Template Generation

The meta-lang CLI includes a template generation feature to quickly bootstrap new applications.

### Generate Application Template

```bash
meta generate app
```

This command creates the following files:
- `config.meta` - Multi-environment configuration file
- `index.js` - Main application file with environment loading
- `.env.example` - Environment variables example file
- Updates `package.json` with meta-lang scripts

The generated template includes:
- Development, staging, and production environments
- Database and cache configuration examples
- Environment variable references with fallbacks
- npm scripts for different environments

### Using Generated Templates

After generating the template:

```bash
# 1. Install dependencies
npm install

# 2. Copy .env.example to .env and fill in your values
cp .env.example .env

# 3. Run the application
npm run dev      # Development environment
npm run staging  # Staging environment
npm run prod     # Production environment
```

## API Reference

### `parseMeta(text, options)`

Parse a `.meta` formatted string.

**Parameters:**
- `text` (string): The `.meta` content to parse
- `options` (object, optional):
  - `strictEnv` (boolean): Throw error if environment variables are missing
  - `warnOnMissing` (boolean): Warn instead of failing for missing env vars

**Returns:** Parsed configuration object

### `loadMeta(path, options)`

Load and parse a `.meta` file from disk.

**Parameters:**
- `path` (string): Path to the `.meta` file
- `options` (object, optional): Same as `parseMeta` options

**Returns:** Parsed configuration object

## CLI Usage

### Basic Parsing

```bash
meta config.meta
meta config.meta --strict-env
meta config.meta --warn-missing
```

### Environment Loading

```bash
meta load --env dev
meta load --env staging
meta load --env prod
```

### Template Generation

```bash
meta generate app
```

### Help

```bash
meta --help
meta -h
```

## Examples

### Complete Configuration File

```meta
# ===============================
# Common settings
# ===============================
@common
app_name:string EnvX
version:float 2.0
debug:bool false

# ===============================
# Development Environment
# ===============================
@env dev
database_host:string localhost
database_port:int 5432
database_username:string dev_user
database_password:env $ENV(DB_PASS_DEV, "devpass")
database_max_connections:int 10

cache_enabled:bool true
cache_host:string localhost
cache_port:int 6379

# ===============================
# Production Environment
# ===============================
@env prod
database_host:string prod.db.envx.io
database_port:int 5432
database_username:string $ENV(DB_USER_PROD)
database_password:env $ENV(DB_PASS_PROD)
database_max_connections:int 200

cache_enabled:bool true
cache_host:string cache.prod.envx.io
cache_port:int 6379
```

### Using in Node.js Application

```javascript
// index.js
const fs = require("fs");
const { parseMeta } = require("meta-lang");

// Parse CLI arguments
const args = process.argv.slice(2);
const envFlagIndex = args.indexOf("--env");
const targetEnv = envFlagIndex !== -1 ? args[envFlagIndex + 1] : "dev";

// Load configuration
const metaText = fs.readFileSync("./config.meta", "utf-8");
const fullConfig = parseMeta(metaText);

// Merge common + environment-specific settings
const config = {
  ...fullConfig.common,
  ...fullConfig[targetEnv],
};

console.log(`Loaded configuration for ${targetEnv}:`, config);
```

## Best Practices

1. **Use `@common`** for shared settings across all environments
2. **Use `@env <name>`** for environment-specific configurations
3. **Use environment variables** for sensitive data like passwords
4. **Provide fallback values** when possible for better developer experience
5. **Add comments** to explain complex configurations
6. **Group related settings** in sections for better organization
7. **Use the generate command** to quickly bootstrap new applications
8. **Keep configuration files organized** with clear section headings

## Error Handling

The parser will throw errors for:
- Missing type declarations
- Invalid type conversions
- Missing environment variables (in strict mode)
- Malformed syntax

Handle errors gracefully in your application:

```javascript
try {
  const config = loadMeta('./config.meta');
} catch (error) {
  console.error('Configuration error:', error.message);
  process.exit(1);
}
```