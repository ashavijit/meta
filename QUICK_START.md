# Quick Start - Express App with meta-lang

## 1. Install Dependencies

```bash
npm install
```

## 2. Run the App

### Development Mode
```bash
# Windows
set NODE_ENV=dev && node app.js

# Linux/Mac
NODE_ENV=dev node app.js
```

### Production Mode
```bash
# Windows
set NODE_ENV=prod && node app.js

# Linux/Mac
NODE_ENV=prod node app.js
```

## 3. Test the Endpoints

Open your browser or use curl:

```bash
# Welcome message
curl http://localhost:3000

# Health check
curl http://localhost:3000/health

# View configuration
curl http://localhost:3000/config
```

## Configuration

Edit `app.config.meta` to customize:
- Port and host
- Database settings
- Cache settings
- Debug mode
- Log levels

## How It Works

1. App loads `app.config.meta` using meta-lang SDK
2. Config is merged: `common` + `dev` (or `prod`)
3. Values are accessed via `config.get('key')`
4. Express uses these values for server configuration

## Example Output

When you run the app, you'll see:

```
🚀 Meta Express App is running!
📍 Server: http://localhost:3000
🌍 Environment: dev
🐛 Debug mode: true

📋 Available endpoints:
   GET  /         - Welcome message
   GET  /health   - Health check
   GET  /config   - Configuration info
```

