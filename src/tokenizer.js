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
  MAP_END: 'MAP_END',
  INDENT: 'INDENT',
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
      
      // Handle @v as a special directive (version tag - skip the line)
      if (section === 'v') {
        // Skip whitespace after @v
        while (i < text.length && /\s/.test(text[i]) && text[i] !== '\n') {
          i++;
        }
        // Skip the rest of the line (version value)
        while (i < text.length && text[i] !== '\n') {
          i++;
        }
        // Skip the newline itself
        if (i < text.length && text[i] === '\n') {
          i++;
        }
        continue; // Skip this line entirely
      }
      
      if (section === 'env') {
        // Skip whitespace after @env
        while (i < text.length && /\s/.test(text[i]) && text[i] !== '\n') {
          i++;
        }
        let envName = '';
        while (i < text.length && /[a-zA-Z0-9_]/.test(text[i])) {
          envName += text[i];
          i++;
        }
        if (envName) {
          tokens.push({ type: TokenType.SECTION, value: `env ${envName}` });
        } else {
          tokens.push({ type: TokenType.SECTION, value: 'env' });
        }
      } else {
        tokens.push({ type: TokenType.SECTION, value: section });
      }
      continue;
    }
    
    if (char === ':') {
      // Check if this colon is followed by a type (letter) or part of a value (like in URLs)
      let peekIndex = i + 1;
      // Skip whitespace
      while (peekIndex < text.length && /\s/.test(text[peekIndex]) && text[peekIndex] !== '\n') {
        peekIndex++;
      }
      
      // If followed by a letter, it's a type separator
      if (peekIndex < text.length && /[a-zA-Z]/.test(text[peekIndex])) {
        i++; // Skip :
        // Skip whitespace after colon
        while (i < text.length && /\s/.test(text[i]) && text[i] !== '\n') {
          i++;
        }
        let type = '';
        while (i < text.length && /[a-zA-Z]/.test(text[i])) {
          type += text[i];
          i++;
        }
        // Only push TYPE token if we found a type
        if (type) {
          tokens.push({ type: TokenType.TYPE, value: type });
        }
        continue;
      } else {
        // Colon is part of the value (like in URLs), treat it as a regular character
        // Fall through to value handling below
      }
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
        while (i < text.length && text[i] !== '\n') {
          word += text[i];
          i++;
        }
        tokens.push({ type: TokenType.VALUE, value: word.trim() });
        continue;
      }
    }
    
    if (char === '"' || char === "'") {
      // String value
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
    
    if (char === '$' && i + 4 < text.length && text.substr(i, 5) === '$ENV(') {
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
    
    // Handle any remaining characters as values (until newline or comment)
    // This includes numbers, strings, version numbers, etc.
    if (i < text.length) {
      let value = '';
      while (i < text.length && text[i] !== '\n') {
        // Stop if we encounter a comment
        if (text[i] === '#') {
          break;
        }
        value += text[i];
        i++;
      }
      const trimmed = value.trim();
      if (trimmed) {
        tokens.push({ type: TokenType.VALUE, value: trimmed });
      }
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