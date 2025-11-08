#!/usr/bin/env node

/**
 * CLI entry point for the meta-lang package
 * Provides command-line interface for parsing .meta files
 * 
 */

const fs = require('fs');
const path = require('path');
const { loadMeta, parseMeta } = require('../src/index.js');

// Animation frames for loading spinner
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerInterval = null;

// Start spinner animation
function startSpinner(text) {
  let i = 0;
  process.stdout.write('\n');
  spinnerInterval = setInterval(() => {
    process.stdout.write(`\r${spinnerFrames[i]} ${text}`);
    i = (i + 1) % spinnerFrames.length;
  }, 80);
}

// Stop spinner animation
function stopSpinner() {
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
    process.stdout.write('\r\x1b[K'); // Clear the line
  }
}

// Animated success message
function showSuccess(message) {
  process.stdout.write('\r\x1b[K'); // Clear the line
  process.stdout.write(`\n✅ ${message}\n`);
}

// Animated error message
function showError(message) {
  process.stdout.write('\r\x1b[K'); // Clear the line
  process.stdout.write(`\n❌ ${message}\n`);
}

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: meta <command> [options]

Commands:
  meta <file.meta>             Parse and output JSON
  meta load --env <name>       Load config for specific environment
  meta generate <template>     Generate template files
  meta help                    Show this help message

Options:
  --strict-env    Throw error if environment variables are missing
  --warn-missing  Warn if environment variables are missing

Examples:
  meta config.meta
  meta config.meta --strict-env
  meta load --env prod
  meta generate app
  `);
  process.exit(0);
}

// Handle the "generate" command for template generation
if (args[0] === 'generate') {
  if (args.length < 2) {
    showError("generate command requires a template type");
    console.error("Usage: meta generate <template>");
    console.error("Available templates: app");
    process.exit(1);
  }
  
  const templateType = args[1];
  
  if (templateType === 'app') {
    generateAppTemplate();
    process.exit(0);
  } else {
    showError(`Unknown template type '${templateType}'`);
    console.error("Available templates: app");
    process.exit(1);
  }
}

// Handle the "load" command for environment-specific configs
if (args[0] === 'load') {
  const envFlagIndex = args.indexOf("--env");
  if (envFlagIndex === -1 || envFlagIndex + 1 >= args.length) {
    showError("--env flag requires an environment name");
    process.exit(1);
  }
  
  const targetEnv = args[envFlagIndex + 1];
  const configPath = './config.meta';
  
  startSpinner(`Loading configuration for environment: ${targetEnv}`);
  
  // Add a small delay to show the animation
  setTimeout(() => {
    stopSpinner();
    
    if (!fs.existsSync(configPath)) {
      showError(`Config file '${configPath}' not found`);
      process.exit(1);
    }
    
    try {
      startSpinner("Parsing configuration file");
      const metaText = fs.readFileSync(configPath, "utf-8");
      const fullConfig = parseMeta(metaText);
      stopSpinner();
      
      if (!fullConfig[targetEnv]) {
        showError(`Environment '${targetEnv}' not found in config`);
        process.exit(1);
      }
      
      startSpinner("Merging configuration");
      const finalConfig = {
        ...fullConfig.common,
        ...fullConfig[targetEnv],
      };
      stopSpinner();
      
      console.log(JSON.stringify(finalConfig, null, 2));
      process.exit(0);
    } catch (error) {
      stopSpinner();
      showError(`${error.message}`);
      process.exit(1);
    }
  }, 300);
  return; // Important: return to prevent further execution
}

// Handle file parsing (original functionality)
const filePath = args[0];

if (!fs.existsSync(filePath)) {
  showError(`File '${filePath}' not found`);
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
  startSpinner(`Loading and parsing ${filePath}`);
  
  // Add a small delay to show the animation
  setTimeout(() => {
    try {
      const result = loadMeta(filePath, options);
      stopSpinner();
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      stopSpinner();
      showError(`${error.message}`);
      process.exit(1);
    }
  }, 200);
} catch (error) {
  stopSpinner();
  showError(`${error.message}`);
  process.exit(1);
}

function generateAppTemplate() {
  console.log("🚀 Generating application template...\n");
  
  const configTemplate = `# ===============================
# 🌍 Common settings (shared)
# ===============================

@common
app_name:string MyApp
version:float 1.0
debug:bool false
default_port:int 3000

# ===============================
# 🧑‍💻 Development
# ===============================

@env dev
database_host:string localhost
database_port:int 5432
database_username:string dev_user
database_password:env $ENV(DB_PASS_DEV, "dev_password")
database_max_connections:int 10
cache_enabled:bool true
cache_host:string localhost
cache_port:int 6379

# ===============================
# 🧪 Staging
# ===============================

@env staging
database_host:string staging.db.myapp.com
database_port:int 5432
database_username:string staging_user
database_password:env $ENV(DB_PASS_STAGING)
database_max_connections:int 50
cache_enabled:bool true
cache_host:string cache.staging.myapp.com
cache_port:int 6380

# ===============================
# 🚀 Production
# ===============================

@env prod
database_host:string prod.db.myapp.com
database_port:int 5432
database_username:string $ENV(DB_USER_PROD)
database_password:env $ENV(DB_PASS_PROD)
database_max_connections:int 200
cache_enabled:bool true
cache_host:string cache.prod.myapp.com
cache_port:int 6379

# Made by Ashavijit
`;
  
  const indexTemplate = `/**
 * Main application file
 * 
 */

const fs = require("fs");
const { parseMeta } = require("meta-lang");

// Simple CLI arg parser
const args = process.argv.slice(2);
const envFlagIndex = args.indexOf("--env");
const targetEnv = envFlagIndex !== -1 ? args[envFlagIndex + 1] : "dev";

console.log(\`🧩 Loading configuration for environment: \${targetEnv}\`);

const metaText = fs.readFileSync("./config.meta", "utf-8");
const fullConfig = parseMeta(metaText);

// Check if environment exists
if (!fullConfig[targetEnv]) {
  console.error(\`Error: Environment '\${targetEnv}' not found in config\`);
  process.exit(1);
}

// Merge common + env-specific
const config = {
  ...fullConfig.common,
  ...fullConfig[targetEnv],
};

// Example usage
console.log("✅ App Name:", config.app_name);
console.log("✅ DB Host:", config.database_host);
console.log("✅ Cache Host:", config.cache_host);

// Export for your app
module.exports = config;
`;
  
  const envExampleTemplate = `# Environment variables example file
# 
# Made by Ashavijit

# Development database password
DB_PASS_DEV=your_dev_password

# Staging database credentials
DB_PASS_STAGING=your_staging_password

# Production database credentials
DB_USER_PROD=your_prod_username
DB_PASS_PROD=your_prod_password
`;
  
  let packageJson = {
    scripts: {
      "start": "node index.js",
      "dev": "node index.js --env dev",
      "staging": "node index.js --env staging",
      "prod": "node index.js --env prod"
    }
  };
  
  if (fs.existsSync('package.json')) {
    try {
      const existingPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      packageJson = {
        ...existingPackage,
        scripts: {
          ...existingPackage.scripts,
          ...packageJson.scripts
        }
      };
    } catch (error) {
      console.warn("Warning: Could not read existing package.json, will create a new one");
    }
  }
  
  try {
    fs.writeFileSync("config.meta", configTemplate);
    showSuccess("Created config.meta");
    
    fs.writeFileSync("index.js", indexTemplate);
    showSuccess("Created index.js");
    
    fs.writeFileSync(".env.example", envExampleTemplate);
    showSuccess("Created .env.example");
    
    fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));
    showSuccess("Updated package.json scripts");
    
    console.log("\n🎉 Application template generated successfully!");
    console.log("\nNext steps:");
    console.log("1. Run 'npm install' to install dependencies");
    console.log("2. Copy .env.example to .env and fill in your values");
    console.log("3. Run 'node index.js --env dev' to start the application");
  } catch (error) {
    showError(`Error generating template: ${error.message}`);
    process.exit(1);
  }
}