#!/usr/bin/env node

/**
 * CLI entry point for the meta-lang package
 * Provides command-line interface for parsing .meta files
 * 
 */

const fs = require('fs');
const path = require('path');
const { loadMeta, parseMeta } = require('../src/index.js');
const versioning = require('../src/versioning.js');
const MetaSDK = require('../src/sdk.js');

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
  process.stdout.write(`\n ${message}\n`);
}

// Animated error message
function showError(message) {
  process.stdout.write('\r\x1b[K'); // Clear the line
  process.stdout.write(`\n${message}\n`);
}

// Create SDK instance
const sdk = new MetaSDK();

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: meta <command> [options]

Commands:
  meta <file.meta>             Parse and output JSON
  meta load --env <name>       Load config for specific environment
  meta generate <template>     Generate template files
  
  Version Control:
  meta init                    Initialize meta versioning
  meta push -m "<message>"     Save current config (only if @v changes)
  meta push -m "<msg>" --force Force push even if @v unchanged
  meta checkout <hash|tag>     Restore config to specific version
  meta status                  Show working directory status
  meta log                     Show version history
  meta log --limit N           Show last N entries
  meta diff [hash1] [hash2]    Show diff between versions
  meta show <hash|tag>         Show version information
  
  Tags:
  meta tag <name>              Create tag for current version
  meta tag <name> <hash>       Create tag for specific version
  meta tag --list              List all tags
  meta tag --delete <name>     Delete a tag
  
  Branches:
  meta branch <name>           Create branch from current version
  meta branch <name> <hash>    Create branch from specific version
  meta branch --list           List all branches
  
  meta help                    Show this help message

Options:
  --strict-env    Throw error if environment variables are missing
  --warn-missing  Warn if environment variables are missing
  --force         Force operation (for push)

Examples:
  meta config.meta
  meta config.meta --strict-env
  meta load --env prod
  meta generate app
  meta init
  meta push -m "Updated configuration"
  meta checkout abc123
  meta tag v1.0.0
  meta status
  meta diff HEAD abc123
  `);
  process.exit(0);
}

// Handle the "init" command for initializing meta versioning
if (args[0] === 'init') {
  try {
    sdk.init();
    showSuccess("Initialized meta versioning system");
    process.exit(0);
  } catch (error) {
    if (error.code === 'ALREADY_INITIALIZED') {
      showError(".meta directory already exists");
    } else {
      showError(`Failed to initialize: ${error.message}`);
    }
    process.exit(1);
  }
}

// Handle the "log" command for showing version history
if (args[0] === 'log') {
  try {
    const limitIndex = args.indexOf('--limit');
    const limit = limitIndex !== -1 && limitIndex + 1 < args.length 
      ? parseInt(args[limitIndex + 1], 10) 
      : null;
    
    const history = sdk.getHistory({ limit, reverse: true });
    
    if (history.length === 0) {
      console.log("No history available");
      process.exit(0);
    }
    
    console.log("Version history:");
    history.forEach((entry, index) => {
      const isLatest = index === 0 ? " (latest)" : "";
      console.log(`\n${entry.shortHash}${isLatest}`);
      console.log(`  Message: ${entry.message}`);
      console.log(`  Date: ${new Date(entry.timestamp).toLocaleString()}`);
      if (entry.parent) {
        console.log(`  Parent: ${entry.parentShortHash}`);
      }
    });
    
    process.exit(0);
  } catch (error) {
    showError(`Failed to get history: ${error.message}`);
    process.exit(1);
  }
}

// Handle the "tag" command
if (args[0] === 'tag') {
  try {
    // List tags
    if (args.includes('--list') || args.includes('-l')) {
      const tags = sdk.listTags();
      if (tags.length === 0) {
        console.log("No tags found");
      } else {
        console.log("Tags:");
        tags.forEach(tag => {
          console.log(`  ${tag.name} -> ${tag.shortHash}`);
        });
      }
      process.exit(0);
    }
    
    // Delete tag
    if (args.includes('--delete') || args.includes('-d')) {
      const deleteIndex = args.indexOf('--delete') !== -1 
        ? args.indexOf('--delete')
        : args.indexOf('-d');
      if (deleteIndex + 1 >= args.length) {
        showError("--delete requires a tag name");
        process.exit(1);
      }
      const tagName = args[deleteIndex + 1];
      sdk.deleteTag(tagName);
      showSuccess(`Deleted tag '${tagName}'`);
      process.exit(0);
    }
    
    // Create tag
    if (args.length < 2) {
      showError("tag command requires a tag name");
      console.error("Usage: meta tag <name> [hash]");
      process.exit(1);
    }
    
    const tagName = args[1];
    const hash = args.length > 2 ? args[2] : null;
    
    const result = sdk.tag(tagName, hash);
    showSuccess(`Created tag '${result.tag}' pointing to ${result.shortHash}`);
    process.exit(0);
  } catch (error) {
    showError(`Tag operation failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle the "checkout" command for restoring versions
if (args[0] === 'checkout') {
  if (args.length < 2) {
    showError("checkout command requires a hash, tag, or branch name");
    console.error("Usage: meta checkout <hash|tag|branch>");
    process.exit(1);
  }
  
  try {
    const result = sdk.checkout(args[1]);
    const refTypeStr = result.refType === 'tag' ? 'tag' : result.refType === 'branch' ? 'branch' : 'version';
    showSuccess(`Checked out ${refTypeStr} ${result.ref} (${result.shortHash})`);
    process.exit(0);
  } catch (error) {
    if (error.code === 'OBJECT_NOT_FOUND') {
      showError(`Version '${args[1]}' not found`);
    } else {
      showError(`Checkout failed: ${error.message}`);
    }
    process.exit(1);
  }
}

// Handle the "push" command for saving versions
if (args[0] === 'push') {
  try {
    // Parse message option
    const messageFlagIndex = args.indexOf("-m");
    if (messageFlagIndex === -1 || messageFlagIndex + 1 >= args.length) {
      showError("-m flag requires a message");
      process.exit(1);
    }
    
    const message = args[messageFlagIndex + 1];
    const force = args.includes('--force');
    
    const result = sdk.push(message, { force });
    
    if (result.skipped) {
      console.log(result.reason);
      process.exit(0);
    }
    
    const versionStr = result.version ? ` (@v: ${result.version})` : '';
    showSuccess(`Saved new version ${result.shortHash}${versionStr}`);
    process.exit(0);
  } catch (error) {
    if (error.code === 'NOT_INITIALIZED') {
      showError("Meta not initialized. Run 'meta init' first.");
    } else {
      showError(`Push failed: ${error.message}`);
    }
    process.exit(1);
  }
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

// Handle the "status" command
if (args[0] === 'status') {
  try {
    const status = sdk.getStatus();
    
    console.log("\n📊 Meta Status\n");
    console.log(`Initialized: ${status.initialized ? '✅ Yes' : '❌ No'}`);
    console.log(`Config file: ${status.configFile} ${status.configExists ? '✅' : '❌ Not found'}`);
    
    if (status.initialized) {
      if (status.latestHash) {
        console.log(`Latest version: ${status.latestShortHash}`);
      } else {
        console.log(`Latest version: None`);
      }
      
      if (status.workingHash) {
        console.log(`Working hash: ${status.workingShortHash}`);
        if (status.hasChanges) {
          console.log(`Status: ⚠️  Modified (differs from latest)`);
        } else {
          console.log(`Status: ✅ Clean (matches latest)`);
        }
        if (status.versionChanged) {
          console.log(`Version tag: ⚠️  Changed (@v tag modified)`);
        } else {
          console.log(`Version tag: ✅ Unchanged`);
        }
      } else {
        console.log(`Status: ⚠️  Config file not found`);
      }
    } else {
      console.log("\n💡 Run 'meta init' to initialize versioning");
    }
    
    console.log();
    process.exit(0);
  } catch (error) {
    showError(`Status check failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle the "diff" command
if (args[0] === 'diff') {
  try {
    let fromHash = args.length > 1 ? args[1] : null;
    let toHash = args.length > 2 ? args[2] : null;
    
    // Handle HEAD alias
    if (fromHash === 'HEAD') {
      fromHash = sdk.getStatus().latestHash;
    }
    if (toHash === 'HEAD') {
      toHash = sdk.getStatus().latestHash;
    }
    
    const diff = sdk.diff(fromHash, toHash);
    
    console.log("\n📋 Diff\n");
    console.log(`Additions: ${diff.stats.additions}, Deletions: ${diff.stats.deletions}\n`);
    
    if (diff.added.length > 0) {
      console.log("➕ Added lines:");
      diff.added.forEach(change => {
        console.log(`  +${change.line}: ${change.content}`);
      });
      console.log();
    }
    
    if (diff.removed.length > 0) {
      console.log("➖ Removed lines:");
      diff.removed.forEach(change => {
        console.log(`  -${change.line}: ${change.content}`);
      });
      console.log();
    }
    
    if (diff.modified.length > 0) {
      console.log("🔄 Modified lines:");
      diff.modified.forEach(change => {
        console.log(`  ${change.line}:`);
        console.log(`    - ${change.old}`);
        console.log(`    + ${change.new}`);
      });
      console.log();
    }
    
    if (diff.added.length === 0 && diff.removed.length === 0 && diff.modified.length === 0) {
      console.log("No differences found");
    }
    
    process.exit(0);
  } catch (error) {
    showError(`Diff failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle the "show" command
if (args[0] === 'show') {
  try {
    if (args.length < 2) {
      showError("show command requires a hash, tag, or branch name");
      console.error("Usage: meta show <hash|tag|branch>");
      process.exit(1);
    }
    
    const info = sdk.getVersionInfo(args[1]);
    
    console.log("\n📦 Version Information\n");
    console.log(`Hash: ${info.hash}`);
    console.log(`Short hash: ${info.shortHash}`);
    console.log(`Ref: ${info.ref} (${info.refType})`);
    if (info.version) {
      console.log(`Version tag: @v ${info.version}`);
    }
    if (info.message) {
      console.log(`Message: ${info.message}`);
    }
    if (info.timestamp) {
      console.log(`Date: ${new Date(info.timestamp).toLocaleString()}`);
    }
    if (info.parent) {
      console.log(`Parent: ${info.parent.substring(0, 8)}`);
    }
    console.log();
    
    process.exit(0);
  } catch (error) {
    showError(`Show failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle the "branch" command
if (args[0] === 'branch') {
  try {
    // List branches
    if (args.includes('--list') || args.includes('-l')) {
      const branches = sdk.listBranches();
      if (branches.length === 0) {
        console.log("No branches found");
      } else {
        console.log("Branches:");
        branches.forEach(branch => {
          console.log(`  ${branch.name} -> ${branch.shortHash}`);
        });
      }
      process.exit(0);
    }
    
    // Create branch
    if (args.length < 2) {
      showError("branch command requires a branch name");
      console.error("Usage: meta branch <name> [hash]");
      process.exit(1);
    }
    
    const branchName = args[1];
    const hash = args.length > 2 ? args[2] : null;
    
    const result = sdk.createBranch(branchName, hash);
    showSuccess(`Created branch '${result.branch}' pointing to ${result.shortHash}`);
    process.exit(0);
  } catch (error) {
    showError(`Branch operation failed: ${error.message}`);
    process.exit(1);
  }
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