/**
 * Integration tests for the meta-lang package
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { parseMeta } = require('../src/parser');
const { loadMeta } = require('../src/loader');

describe('Integration Tests', () => {
  let tempDir;
  let originalEnv;
  
  // Save original environment variables before tests
  beforeAll(() => {
    originalEnv = { ...process.env };
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meta-test-'));
  });
  
  // Restore original environment variables after each test
  afterEach(() => {
    process.env = { ...originalEnv };
  });
  
  // Clean up temporary directory after all tests
  afterAll(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });
  
  test('should parse a simple meta file', () => {
    const metaContent = `
@app
name:string EnvX
version:float 1.4
debug:bool true
`;
    
    const result = parseMeta(metaContent);
    
    expect(result).toEqual({
      app: {
        name: 'EnvX',
        version: 1.4,
        debug: true
      }
    });
  });
  
  test('should parse meta file with environment variables', () => {
    process.env.DB_USER = 'testuser';
    process.env.DB_PASS = 'testpass';
    
    const metaContent = `
@database
host:string localhost
port:int 5432
username:string $ENV(DB_USER)
password:env $ENV(DB_PASS)
`;
    
    const result = parseMeta(metaContent);
    
    expect(result).toEqual({
      database: {
        host: 'localhost',
        port: 5432,
        username: 'testuser',
        password: 'testpass'
      }
    });
  });
  
  test('should load meta file from disk', () => {
    const metaContent = `
@app
name:string TestApp
port:int 3000
`;
    
    const filePath = path.join(tempDir, 'test.meta');
    fs.writeFileSync(filePath, metaContent);
    
    const result = loadMeta(filePath);
    
    expect(result).toEqual({
      app: {
        name: 'TestApp',
        port: 3000
      }
    });
  });
  
  test('should throw error for missing file', () => {
    expect(() => {
      loadMeta('/non/existent/file.meta');
    }).toThrow();
  });
  
  test('should handle list values', () => {
    const metaContent = `
@app
tags:list [prod,backend,secure]
`;
    
    const result = parseMeta(metaContent);
    
    expect(result).toEqual({
      app: {
        tags: ['prod', 'backend', 'secure']
      }
    });
  });
});