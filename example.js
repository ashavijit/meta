/**
 * meta-lang SDK Example
 * Demonstrates how to use meta-lang in your application
 */

const { loadConfig, MetaSDK } = require('./src/index');
const config = require('./src/app-config');

console.log('=== meta-lang SDK Example ===\n');

// Example 1: Simple config loading
console.log('1. Loading configuration with ConfigLoader:');
try {
  const loader = loadConfig({
    configPath: './examples/example.meta',
    env: 'dev'
  });
  
  console.log('   Port:', loader.get('port'));
  console.log('   Debug:', loader.get('debug'));
  console.log('   Database host:', loader.get('database_host'));
} catch (error) {
  console.error('   Error:', error.message);
}

console.log();

// Example 2: App config (dotenv-like)
console.log('2. Using app-config (dotenv replacement):');
try {
  config.initConfig({
    configPath: './examples/example.meta',
    env: 'dev',
    setEnv: false // Don't set process.env in example
  });
  
  console.log('   Port:', config.get('port'));
  console.log('   App name:', config.get('app_name'));
  console.log('   All config keys:', config.getAll());
} catch (error) {
  console.error('   Error:', error.message);
}

console.log();

// Example 3: Version control SDK
console.log('3. Using MetaSDK for version control:');
try {
  const sdk = new MetaSDK({
    configFile: 'examples/example.meta'
  });
  
  // Check if initialized
  if (!sdk.isInitialized()) {
    console.log('   Initializing version control...');
    sdk.init();
  }
  
  // Get status
  const status = sdk.getStatus();
  console.log('   Status:', {
    initialized: status.initialized,
    hasChanges: status.hasChanges,
    versionChanged: status.versionChanged
  });
  
  // Get working config
  const workingConfig = sdk.getWorkingConfigParsed();
  console.log('   Working config keys:', Object.keys(workingConfig));
  
} catch (error) {
  console.error('   Error:', error.message);
}

console.log('\n=== End of Example ===');

