/**
 * Example application demonstrating meta-lang usage
 */

const { loadMeta, parseMeta } = require('./src/index.js');

console.log('=== meta-lang Example Application ===\n');

console.log('1. Loading configuration from file:');
try {
  const config = loadMeta('./config.meta');
  console.log('   Common settings:', config.common);
  console.log('   Development env:', Object.keys(config.dev || {}));
  console.log('   Production env:', Object.keys(config.prod || {}));
} catch (error) {
  console.error('   Error loading config:', error.message);
}

console.log();

console.log('2. Parsing configuration string:');
const configString = `
@app
name:string MyApp
version:float 1.5
debug:bool true
features:list [auth, logging, metrics]
`;

try {
  const config = parseMeta(configString);
  console.log('   App name:', config.app.name);
  console.log('   Version:', config.app.version);
  console.log('   Debug mode:', config.app.debug);
  console.log('   Features:', config.app.features);
} catch (error) {
  console.error('   Error parsing config:', error.message);
}

console.log();

console.log('3. Environment-specific configuration:');
const args = process.argv.slice(2);
const envFlagIndex = args.indexOf('--env');
const targetEnv = envFlagIndex !== -1 ? args[envFlagIndex + 1] : 'dev';

console.log(`   Loading configuration for environment: ${targetEnv}`);

try {
  const metaText = require('fs').readFileSync('./config.meta', 'utf-8');
  const fullConfig = parseMeta(metaText);
  
  if (!fullConfig[targetEnv]) {
    console.log(`   Warning: Environment '${targetEnv}' not found, using 'dev'`);
    targetEnv = 'dev';
  }
  
  if (fullConfig[targetEnv]) {
    const finalConfig = {
      ...fullConfig.common,
      ...fullConfig[targetEnv],
    };
    
    console.log('   App name:', finalConfig.app_name);
    console.log('   DB host:', finalConfig.database_host);
    console.log('   Cache host:', finalConfig.cache_host);
    console.log('   Debug mode:', finalConfig.debug);
  } else {
    console.log('   Environment configuration not found');
  }
} catch (error) {
  console.error('   Error loading environment config:', error.message);
}

console.log('\n=== End of Examples ===');