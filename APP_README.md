# Express App with meta-lang SDK

A simple Express.js application demonstrating how to use the meta-lang SDK for configuration management.

## Features

- ✅ Environment-based configuration (dev/prod)
- ✅ Type-safe config values
- ✅ Environment variable support
- ✅ Auto-loading and validation
- ✅ Clean, simple API

## Installation

```bash
npm install
```

## Configuration

The app uses `app.config.meta` for configuration. You can modify it to change:
- Port and host
- Database settings
- Cache settings
- Debug mode
- Log levels

## Running the App

### Development Mode
```bash
NODE_ENV=dev node app.js
```

Or on Windows:
```bash
set NODE_ENV=dev && node app.js
```

### Production Mode
```bash
NODE_ENV=prod node app.js
```

## Environment Variables

For production, you may need to set these environment variables:

```bash
DB_HOST=your-db-host
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASS=your-db-password
CACHE_HOST=your-cache-host
```

## API Endpoints

- `GET /` - Welcome message with app info
- `GET /health` - Health check endpoint
- `GET /config` - View current configuration (non-sensitive)

## Example Usage

```bash
# Start the app
node app.js

# In another terminal, test the endpoints
curl http://localhost:3000
curl http://localhost:3000/health
curl http://localhost:3000/config
```

## How It Works

1. The app initializes the meta-lang config at startup
2. Config values are loaded from `app.config.meta`
3. Environment-specific settings are merged (common + env)
4. Config values are accessed using `config.get('key')`
5. The Express app uses these values for port, host, etc.

## Customization

Edit `app.config.meta` to customize:
- Add new config keys
- Change environment settings
- Add new environments (staging, test, etc.)

