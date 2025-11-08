
const { loadMeta, parseMeta } = require('./src/index.js');

console.log('=== Loading from file ===');
try {
  const config = loadMeta('./example.meta');
  console.log('App name:', config.app.name);
  console.log('Database host:', config.database.host);
  console.log('Cache enabled:', config.cache.enabled);
  console.log('Tags:', config.app.tags);
} catch (error) {
  console.error('Error loading config:', error.message);
}

console.log('\n=== Parsing string ===');
const metaString = `
@app
name:string MyApp
version:float 2.1
debug:bool false
`;

try {
  const config = parseMeta(metaString);
  console.log('Parsed config:', JSON.stringify(config, null, 2));
} catch (error) {
  console.error('Error parsing config:', error.message);
}