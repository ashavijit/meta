/**
 * Parser module for .meta files
 * Handles parsing of the custom configuration language into JavaScript objects
 */

const { TokenType, tokenize } = require('./tokenizer');
const { TypeConverter } = require('./type-converter');
const { EnvironmentResolver } = require('./environment-resolver');

/**
 * Parses a .meta formatted string into a JavaScript object
 * @param {string} text - The .meta file content as a string
 * @param {Object} options - Parsing options
 * @returns {Object} - The parsed configuration object
 */
function parseMeta(text, options = {}) {
  const tokens = tokenize(text);
  const converter = new TypeConverter();
  const envResolver = new EnvironmentResolver(options);
  
  let result = {};
  let currentSection = null;
  let i = 0;
  
  while (i < tokens.length) {
    const token = tokens[i];
    
    if (token.type === TokenType.SECTION) {
      currentSection = token.value;
      result[currentSection] = {};
      i++;
      continue;
    }
    
    if (token.type === TokenType.IDENTIFIER) {
      const key = token.value;
      i++; 
      
      if (i >= tokens.length || tokens[i].type !== TokenType.TYPE) {
        throw new Error(`Expected type declaration after key '${key}'`);
      }
      
      const typeInfo = tokens[i];
      i++; // Move to value token
      
      while (i < tokens.length && 
             (tokens[i].type === TokenType.WHITESPACE || 
              tokens[i].type === TokenType.NEWLINE)) {
        i++;
      }
      
      if (i >= tokens.length) {
        throw new Error(`Expected value for key '${key}'`);
      }
      
      if (tokens[i].type === TokenType.LIST_START) {
        const listTokens = [];
        i++; // Skip LIST_START
        let listDepth = 1;
        
        while (i < tokens.length && listDepth > 0) {
          if (tokens[i].type === TokenType.LIST_START) {
            listDepth++;
          } else if (tokens[i].type === TokenType.LIST_END) {
            listDepth--;
          }
          
          if (listDepth > 0) {
            listTokens.push(tokens[i]);
          }
          i++;
        }
        
        let listStr = '[';
        for (let j = 0; j < listTokens.length; j++) {
          if (listTokens[j].type !== TokenType.WHITESPACE && 
              listTokens[j].type !== TokenType.NEWLINE &&
              listTokens[j].type !== TokenType.LIST_SEPARATOR) {
            listStr += listTokens[j].value;
            if (j < listTokens.length - 1 && 
                listTokens[j].type !== TokenType.LIST_SEPARATOR &&
                (j + 1 < listTokens.length && 
                 listTokens[j+1].type !== TokenType.LIST_SEPARATOR &&
                 listTokens[j+1].type !== TokenType.LIST_END)) {
              listStr += ',';
            }
          } else if (listTokens[j].type === TokenType.LIST_SEPARATOR) {
            listStr += ',';
          }
        }
        listStr += ']';
        
        let value = listStr;
        
        try {
          value = converter.convert(typeInfo.value, value, envResolver);
        } catch (error) {
          throw new Error(`Error converting value for key '${key}': ${error.message}`);
        }
        
        if (currentSection) {
          result[currentSection][key] = value;
        } else {
          result[key] = value;
        }
        continue;
      }
      
      if (tokens[i].type !== TokenType.VALUE && tokens[i].type !== TokenType.ENV_VAR) {
        throw new Error(`Expected value for key '${key}', got ${tokens[i].type}`);
      }
      
      const valueToken = tokens[i];
      let value = valueToken.value;
      
      try {
        value = converter.convert(typeInfo.value, value, envResolver);
      } catch (error) {
        throw new Error(`Error converting value for key '${key}': ${error.message}`);
      }
      
      if (currentSection) {
        result[currentSection][key] = value;
      } else {
        result[key] = value;
      }
      
      i++;
      continue;
    }
    
    if (token.type === TokenType.COMMENT || 
        token.type === TokenType.WHITESPACE || 
        token.type === TokenType.NEWLINE) {
      i++;
      continue;
    }
    
    if (token.type === TokenType.MAP_START) {
      i++;
      continue;
    }
    
    throw new Error(`Unexpected token: ${token.type} with value '${token.value}'`);
  }
  
  return result;
}

module.exports = {
  parseMeta
};