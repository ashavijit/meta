/**
 * Tokenizer module for .meta files
 * Converts text into a stream of tokens for parsing
 */

const TokenType = {
  SECTION: 'SECTION',
  IDENTIFIER: 'IDENTIFIER',
  TYPE: 'TYPE',
  VALUE: 'VALUE',
  COMMENT: 'COMMENT',
  WHITESPACE: 'WHITESPACE',
  NEWLINE: 'NEWLINE',
  LIST_START: 'LIST_START',
  LIST_END: 'LIST_END',
  LIST_SEPARATOR: 'LIST_SEPARATOR',
  MAP_START: 'MAP_START',
  ENV_VAR: 'ENV_VAR'
};

/**
 * Tokenizes a .meta formatted string into tokens
 * @param {string} text - The .meta file content as a string
 * @returns {Array} - Array of token objects
 */
function tokenize(text) {
  const tokens = [];
  let i = 0;
  
  while (i < text.length) {
    let char = text[i];
    
    if (/\s/.test(char)) {
      if (char === '\n') {
        tokens.push({ type: TokenType.NEWLINE, value: char });
      } else {
        tokens.push({ type: TokenType.WHITESPACE, value: char });
      }
      i++;
      continue;
    }
    
    if (char === '#') {
      let comment = '';
      i++; // Skip #
      while (i < text.length && text[i] !== '\n') {
        comment += text[i];
        i++;
      }
      tokens.push({ type: TokenType.COMMENT, value: comment.trim() });
      continue;
    }
    
    if (char === '@') {
      i++; // Skip @
      let section = '';
      while (i < text.length && /[a-zA-Z0-9_]/.test(text[i])) {
        section += text[i];
        i++;
      }
      tokens.push({ type: TokenType.SECTION, value: section });
      continue;
    }
    
    if (char === ':') {
      i++; // Skip :
      let type = '';
      while (i < text.length && /[a-zA-Z]/.test(text[i])) {
        type += text[i];
        i++;
      }
      tokens.push({ type: TokenType.TYPE, value: type });
      continue;
    }
    
    if (/[a-zA-Z_]/.test(char)) {
      let word = '';
      while (i < text.length && /[a-zA-Z0-9_]/.test(text[i])) {
        word += text[i];
        i++;
      }
      
      let nextI = i;
      while (nextI < text.length && /\s/.test(text[nextI])) {
        nextI++;
      }
      
      if (nextI < text.length && text[nextI] === ':') {
        tokens.push({ type: TokenType.IDENTIFIER, value: word });
        continue;
      } else {
        tokens.push({ type: TokenType.VALUE, value: word });
        continue;
      }
    }
    
    if (char === '"' || char === "'") {
      const quote = char;
      i++; // Skip opening quote
      let value = '';
      while (i < text.length && text[i] !== quote) {
        value += text[i];
        i++;
      }
      i++; // Skip closing quote
      tokens.push({ type: TokenType.VALUE, value: value });
      continue;
    }
    
    if (char === '[') {
      tokens.push({ type: TokenType.LIST_START, value: char });
      i++;
      continue;
    }
    
    if (char === ']') {
      tokens.push({ type: TokenType.LIST_END, value: char });
      i++;
      continue;
    }
    
    if (char === ',') {
      tokens.push({ type: TokenType.LIST_SEPARATOR, value: char });
      i++;
      continue;
    }
    
    if (char === '{') {
      tokens.push({ type: TokenType.MAP_START, value: char });
      i++;
      continue;
    }
    
    if (/[0-9\-\.]/.test(char)) {
      let numStr = '';
      while (i < text.length && /[0-9\-\.eE]/.test(text[i])) {
        numStr += text[i];
        i++;
      }
      tokens.push({ type: TokenType.VALUE, value: numStr });
      continue;
    }
    
    if (text.substr(i, 5) === '$ENV(') {
      let envStr = '$ENV(';
      i += 5; // Skip $ENV(
      let parenCount = 1;
      while (i < text.length && parenCount > 0) {
        if (text[i] === '(') parenCount++;
        if (text[i] === ')') parenCount--;
        envStr += text[i];
        i++;
      }
      tokens.push({ type: TokenType.ENV_VAR, value: envStr });
      continue;
    }
    
    i++;
  }
  
  return tokens;
}

module.exports = {
  TokenType,
  tokenize
};