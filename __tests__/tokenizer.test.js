/**
 * Test suite for the tokenizer module
 */

const { tokenize, TokenType } = require('../src/tokenizer');

describe('Tokenizer', () => {
  test('should tokenize sections', () => {
    const input = '@app\nname:string test';
    const tokens = tokenize(input);
    
    expect(tokens).toEqual(
      expect.arrayContaining([
        { type: TokenType.SECTION, value: 'app' },
        { type: TokenType.IDENTIFIER, value: 'name' },
        { type: TokenType.TYPE, value: 'string' },
        { type: TokenType.VALUE, value: 'test' }
      ])
    );
  });
  
  test('should tokenize comments', () => {
    const input = '# This is a comment\nname:string test';
    const tokens = tokenize(input);
    
    expect(tokens).toEqual(
      expect.arrayContaining([
        { type: TokenType.COMMENT, value: 'This is a comment' },
        { type: TokenType.IDENTIFIER, value: 'name' }
      ])
    );
  });
  
  test('should tokenize string values', () => {
    const input = 'name:string "test value"';
    const tokens = tokenize(input);
    
    // Filter out whitespace tokens for cleaner testing
    const nonWhitespaceTokens = tokens.filter(token => 
      token.type !== TokenType.WHITESPACE && token.type !== TokenType.NEWLINE
    );
    
    expect(nonWhitespaceTokens).toEqual(
      expect.arrayContaining([
        { type: TokenType.IDENTIFIER, value: 'name' },
        { type: TokenType.TYPE, value: 'string' },
        { type: TokenType.VALUE, value: 'test value' }
      ])
    );
  });
  
  test('should tokenize integer values', () => {
    const input = 'port:int 8080';
    const tokens = tokenize(input);
    
    // Filter out whitespace tokens for cleaner testing
    const nonWhitespaceTokens = tokens.filter(token => 
      token.type !== TokenType.WHITESPACE && token.type !== TokenType.NEWLINE
    );
    
    expect(nonWhitespaceTokens).toEqual(
      expect.arrayContaining([
        { type: TokenType.IDENTIFIER, value: 'port' },
        { type: TokenType.TYPE, value: 'int' },
        { type: TokenType.VALUE, value: '8080' }
      ])
    );
  });
  
  test('should tokenize boolean values', () => {
    const input = 'debug:bool true';
    const tokens = tokenize(input);
    
    // Filter out whitespace tokens for cleaner testing
    const nonWhitespaceTokens = tokens.filter(token => 
      token.type !== TokenType.WHITESPACE && token.type !== TokenType.NEWLINE
    );
    
    expect(nonWhitespaceTokens).toEqual(
      expect.arrayContaining([
        { type: TokenType.IDENTIFIER, value: 'debug' },
        { type: TokenType.TYPE, value: 'bool' },
        { type: TokenType.VALUE, value: 'true' }
      ])
    );
  });
  
  test('should tokenize environment variables', () => {
    const input = 'db_user:string $ENV(DB_USER)';
    const tokens = tokenize(input);
    
    // Filter out whitespace tokens for cleaner testing
    const nonWhitespaceTokens = tokens.filter(token => 
      token.type !== TokenType.WHITESPACE && token.type !== TokenType.NEWLINE
    );
    
    expect(nonWhitespaceTokens).toEqual(
      expect.arrayContaining([
        { type: TokenType.IDENTIFIER, value: 'db_user' },
        { type: TokenType.TYPE, value: 'string' },
        { type: TokenType.ENV_VAR, value: '$ENV(DB_USER)' }
      ])
    );
  });
});