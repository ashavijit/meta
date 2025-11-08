# 🧩 meta-lang

> A **human-friendly**, **typed**, and **comment-supported** configuration language for modern developers — like JSON, but better.
>
> ✨ `.meta` = JSON + YAML + Type Hints + `.env` combined.

---

## 🚀 Features

| Feature                | Description                                                       |
| ---------------------- | ----------------------------------------------------------------- |
| 🧠 **Typed keys**      | Every key has a defined data type (`string`, `int`, `bool`, etc.) |
| 💬 **Comments**        | Use `#` anywhere, like in Python                                  |
| ⚙️ **Sections**        | Group related configs using `@section`                            |
| 🔒 **Env vars**        | `$ENV(VARNAME)` pulls from environment                            |
| 🧩 **Fallbacks**       | `$ENV(NAME, "default")` for defaults                              |
| 🧾 **JSON-compatible** | Converts easily to JSON                                           |
| 🧰 **CLI + API**       | Use as library or command line tool                               |
| 🪶 **Readable**        | Less syntax noise, better readability                             |

---

## 📦 Install

```bash
npm install meta-lang
```

Or globally for CLI:

```bash
npm install -g meta-lang
```

---

## ✨ Example `.meta` file

`config.meta`

```meta
# Application metadata
@app
name:string EnvX
version:float 1.4
debug:bool true
tags:list [prod, backend, secure]

# Database configuration
@database
host:string localhost
port:int 5432
username:string $ENV(DB_USER, "admin")
password:env $ENV(DB_PASS)
max_connections:int 100

# Cache setup
@cache
enabled:bool true
engine:string redis
config:map
  host:string localhost
  port:int 6379
  timeout:int 30

# Feature toggles
@features
auth:bool true
analytics:bool false
```

---

## ⚙️ Example `.env` file (optional)

```
DB_USER=avijit
DB_PASS=supersecret123
```

---

## 🧩 Example JavaScript Usage

`index.js`

```js
import { loadMeta } from "meta-lang";
import dotenv from "dotenv";

dotenv.config(); // Load .env file

const config = loadMeta("./config.meta");

console.log("App:", config.app.name);
console.log("DB Host:", config.database.host);
console.log("DB User:", config.database.username);
console.log("Cache enabled?", config.cache.enabled);
```

---

## 🧠 Output

```bash
App: EnvX
DB Host: localhost
DB User: avijit
Cache enabled? true
```

---

## 🧰 CLI Usage

After installing globally:

```bash
meta config.meta
```

**Output:**

```json
{
  "app": {
    "name": "EnvX",
    "version": 1.4,
    "debug": true,
    "tags": ["prod", "backend", "secure"]
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "username": "avijit",
    "password": "supersecret123",
    "max_connections": 100
  },
  "cache": {
    "enabled": true,
    "engine": "redis",
    "config": {
      "host": "localhost",
      "port": 6379,
      "timeout": 30
    }
  },
  "features": {
    "auth": true,
    "analytics": false
  }
}
```

### Template Generation

Quickly bootstrap new applications with the template generation feature:

```bash
meta generate app
```

This creates a complete application structure with:
- Multi-environment configuration file
- Environment variable examples
- Pre-configured npm scripts
- Working application example

---

## 🧩 Supported Types

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
| Type-aware              | Works with `:env`, `:string`, etc. |

Example:

```meta
db_user:string $ENV(DB_USER, "root")
db_pass:env $ENV(DB_PASS)
```

---

## 🧩 API Reference

```js
import { parseMeta, loadMeta } from "meta-lang";
```

### `parseMeta(text: string, options?: object)`

Parse raw `.meta` content string.

```js
const data = parseMeta(`
@app
name:string EnvX
`);
console.log(data.app.name);
```

---

### `loadMeta(path: string, options?: { strictEnv?: boolean })`

Load and parse `.meta` file from disk.

```js
const config = loadMeta("./config.meta", { strictEnv: true });
```

---

## ⚙️ Options

| Option          | Type      | Description                         |
| --------------- | --------- | ----------------------------------- |
| `strictEnv`     | `boolean` | Throws error if `$ENV()` is missing |
| `warnOnMissing` | `boolean` | Warns instead of failing            |
| `expandEnv`     | `boolean` | Resolves all env vars automatically |

---

## 🧾 Example JSON Conversion

```bash
meta config.meta > config.json
```

---

## 🔮 Coming Soon

* `meta schema` → generate validation schema
* `meta fmt` → auto-format `.meta` files
* `meta import` → import other `.meta` configs
* VSCode extension for `.meta` highlighting
* TypeScript typings + JSON Schema generator

---

## 🧰 Example Folder Layout

```
project/
├── config.meta
├── .env
├── src/
│   └── index.js
├── package.json
└── node_modules/
```

---

## 📜 License

MIT © 2025 — built for developers who love clean configs ❤️

