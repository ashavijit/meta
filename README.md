# 🧩 meta-lang

> A **human-friendly**, **typed**, and **comment-supported** configuration language for modern developers — like JSON, but better.

> ✨ `.meta` = JSON + YAML + Type Hints + `.env` combined.

---

## 🚀 Quick Start

### Installation

```bash
npm install meta-lang
```

### Basic Usage

```javascript
const { loadConfig } = require('meta-lang');

// Load and use config (dotenv-like API)
const config = loadConfig({
  env: process.env.NODE_ENV || 'dev'
});

// Access config values
const port = config.get('port');
const dbHost = config.get('database.host');
```

### Simple App Config (dotenv replacement)

```javascript
const config = require('meta-lang/app-config');

// Initialize once at app startup
config.initConfig({
  env: process.env.NODE_ENV || 'dev',
  setEnv: true // Auto-set process.env variables
});

// Use like dotenv
const port = config.get('port');
const dbHost = config.get('database_host');
```

---

## 📝 Example `config.meta` File

```meta
# Application metadata
@common
@v 1.0.0
app_name:string MyApp
version:float 1.0.0
description:string A production-ready Node.js application

# Development Environment
@env dev
debug:bool true
port:int 3000
host:string localhost
database_host:string localhost
database_password:env $ENV(DB_PASS, "dev_password")

# Production Environment
@env prod
debug:bool false
port:int 8080
host:string api.myapp.com
database_host:string prod.db.com
database_password:env $ENV(DB_PASS)
```

---

## 🧩 SDK API

### Core Functions

```javascript
const { parseMeta, loadMeta, MetaSDK, ConfigLoader } = require('meta-lang');
```

#### `parseMeta(text, options)`

Parse raw `.meta` content string.

```javascript
const data = parseMeta(`
@app
name:string MyApp
version:float 1.4
`);
```

#### `loadMeta(path, options)`

Load and parse `.meta` file from disk.

```javascript
const config = loadMeta('./config.meta', { strictEnv: true });
```

#### `ConfigLoader` - Production Config Loader

```javascript
const { ConfigLoader } = require('meta-lang');

const config = new ConfigLoader({
  configPath: './config.meta',
  env: 'dev',
  strictEnv: false,
  watch: true // Auto-reload on file changes
});

// Get config values
const port = config.get('port');
const dbHost = config.get('database.host');

// Get full config
const allConfig = config.get();

// Reload config
config.reload();
```

#### `loadConfig(options)` - Convenience Function

```javascript
const { loadConfig } = require('meta-lang');

const config = loadConfig({
  env: 'dev',
  strictEnv: false
});
```

### App Config API (dotenv-like)

```javascript
const config = require('meta-lang/app-config');

// Initialize
config.initConfig({
  env: process.env.NODE_ENV || 'dev',
  setEnv: true // Auto-set process.env
});

// Get values
const port = config.get('port');
const all = config.getAll();

// Validate
config.validate(['port', 'database_host']);

// Reload
config.reload();
```

### Version Control SDK

```javascript
const { MetaSDK } = require('meta-lang');

// Create SDK instance
const sdk = new MetaSDK({
  baseDir: process.cwd(),
  configFile: 'config.meta'
});

// Initialize versioning
sdk.init();

// Push a new version (only if @v tag changed)
const result = sdk.push('Updated configuration');
console.log(`Saved version: ${result.shortHash}`);

// Checkout a version
sdk.checkout('abc12345');

// Create a tag
sdk.tag('v1.0.0');

// Get status
const status = sdk.getStatus();

// Get history
const history = sdk.getHistory({ limit: 10 });

// Compute diff
const diff = sdk.diff('abc12345', 'def67890');
```

#### MetaSDK Methods

| Method | Description |
|--------|-------------|
| `init()` | Initialize versioning system |
| `isInitialized()` | Check if initialized |
| `push(message, options)` | Push config to version control |
| `checkout(ref)` | Checkout version by hash/tag/branch |
| `tag(tagName, hash)` | Create a tag |
| `listTags()` | List all tags |
| `deleteTag(tagName)` | Delete a tag |
| `createBranch(branchName, hash)` | Create a branch |
| `listBranches()` | List all branches |
| `getHistory(options)` | Get version history |
| `getStatus()` | Get current status |
| `diff(fromHash, toHash)` | Compute diff between versions |
| `getVersionInfo(ref)` | Get version information |
| `getWorkingConfig()` | Get working config content |
| `getWorkingConfigParsed()` | Get parsed working config |
| `hasVersionChanged()` | Check if @v tag changed |

---

## 🧠 Supported Types

| Type     | Example                   | JS Output                     |
| -------- | ------------------------- | ----------------------------- |
| `string` | `name:string EnvX`        | `"EnvX"`                      |
| `int`    | `port:int 8080`           | `8080`                        |
| `float`  | `version:float 1.2`       | `1.2`                         |
| `bool`   | `debug:bool true`         | `true`                        |
| `list`   | `tags:list [a, b, c]`     | `["a","b","c"]`               |
| `map`    | `cache:map ...`           | `{}`                          |
| `env`    | `password:env $ENV(PASS)` | value from `process.env.PASS` |

---

## 🧬 Environment Variables

| Syntax                  | Behavior                           |
| ----------------------- | ---------------------------------- |
| `$ENV(NAME)`            | Pulls `process.env.NAME`           |
| `$ENV(NAME, "default")` | Uses fallback if not set           |

Example:

```meta
db_user:string $ENV(DB_USER, "root")
db_pass:env $ENV(DB_PASS)
```

---

## ⚙️ Options

| Option          | Type      | Description                         |
| --------------- | --------- | ----------------------------------- |
| `strictEnv`     | `boolean` | Throws error if `$ENV()` is missing |
| `warnOnMissing` | `boolean` | Warns instead of failing            |
| `env`           | `string`  | Environment name (dev/prod/staging) |
| `watch`         | `boolean` | Watch for file changes and reload   |
| `flatten`       | `boolean` | Flatten nested config to dot notation |

---

## 🧰 CLI Usage

After installing globally:

```bash
npm install -g meta-lang
```

Parse a config file:

```bash
meta config.meta
```

Version control commands:

```bash
meta init                    # Initialize versioning
meta push "message"          # Push new version
meta status                  # Check status
meta checkout <hash>         # Checkout version
meta tag <name>              # Create tag
meta history                 # Show history
meta diff <from> <to>        # Show diff
```

---

## 📚 Complete Example

```javascript
// app.js
const express = require('express');
const config = require('meta-lang/app-config');

// Initialize config
config.initConfig({
  env: process.env.NODE_ENV || 'dev',
  strictEnv: process.env.NODE_ENV === 'production',
  validateRequired: true
});

// Validate required keys
config.validate(['port', 'database_host', 'database_password']);

// Use config
const app = express();
const port = config.get('port', 3000);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'dev'}`);
  console.log(`Debug mode: ${config.get('debug')}`);
});
```

---

## 🔧 Advanced Usage

### Custom Base Directory

```javascript
const sdk = new MetaSDK({
  baseDir: '/path/to/project',
  configFile: 'my-config.meta'
});
```

### Working with Multiple Configs

```javascript
const prodConfig = new ConfigLoader({ 
  configPath: './config.prod.meta',
  env: 'prod'
});

const devConfig = new ConfigLoader({ 
  configPath: './config.dev.meta',
  env: 'dev'
});
```

### File Watching (Auto-reload)

```javascript
const config = new ConfigLoader({
  watch: true,
  onReload: (newConfig) => {
    console.log('Config reloaded:', newConfig);
  },
  onError: (error) => {
    console.error('Config error:', error);
  }
});
```

---

## 🧾 Error Handling

```javascript
const { ConfigError, ConfigNotFoundError } = require('meta-lang');
const { versioning } = require('meta-lang');

try {
  const config = loadConfig();
} catch (error) {
  if (error instanceof ConfigNotFoundError) {
    console.error('Config file not found');
  } else if (error instanceof ConfigError) {
    console.error('Config error:', error.message);
  }
}

try {
  sdk.push('Message');
} catch (error) {
  if (error instanceof versioning.VersioningError) {
    console.error(`Versioning error: ${error.message}`);
  }
}
```

---

## 📜 License

MIT © 2025 — built for developers who love clean configs ❤️
