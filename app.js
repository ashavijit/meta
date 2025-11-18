/**
 * Simple Express App using meta-lang SDK
 * Demonstrates how to use meta-lang for configuration management
 */

const express = require('express');
const config = require('./src/app-config');

// Initialize config (loads app.config.meta)
config.initConfig({
  configPath: './app.config.meta',
  env:'prod',
  setEnv: true, // Auto-set process.env variables
  warnOnMissing: true
}); 

// Create Express app
const app = express();

// Get config values
const port = config.get('port', 3000);
const host = config.get('host', 'localhost');
const appName = config.get('app_name', 'Meta App');
const debug = config.get('debug', false);

// Middleware
app.use(express.json());

// Logging middleware (if debug is enabled)
if (debug) {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.get('/', (req, res) => {
  res.json({
    message: `Welcome to ${appName}`,
    environment: process.env.NODE_ENV || 'dev',
    config: {
      app_name: config.get('app_name'),
      version: config.get('version'),
      debug: config.get('debug'),
      port: config.get('port'),
      host: config.get('host')
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'dev'
  });
});

app.get('/config', (req, res) => {
  // Return non-sensitive config
  const safeConfig = {
    app_name: config.get('app_name'),
    version: config.get('version'),
    description: config.get('description'),
    debug: config.get('debug'),
    log_level: config.get('log_level'),
    timeout: config.get('timeout'),
    port: config.get('port'),
    host: config.get('host'),
    database_driver: config.get('database_driver'),
    database_host: config.get('database_host'),
    cache_enabled: config.get('cache_enabled'),
    cache_host: config.get('cache_host'),
    cache_port: config.get('cache_port')
  };
  res.json(safeConfig);
});

// Start server
app.listen(port, host, () => {
  console.log(`\n🚀 ${appName} is running!`);
  console.log(`📍 Server: http://${host}:${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'dev'}`);
  console.log(`🐛 Debug mode: ${debug}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /         - Welcome message`);
  console.log(`   GET  /health   - Health check`);
  console.log(`   GET  /config   - Configuration info\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

