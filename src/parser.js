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
  
  let mapStack = [];
  
  while (i < tokens.length) {
    const token = tokens[i];
    
    if (token.type === TokenType.SECTION) {
      if (token.value.startsWith('env ')) {
        const envName = token.value.substring(4); // Remove "env " prefix
        currentSection = envName;
        result[currentSection] = {};
      } else {
        currentSection = token.value;
        result[currentSection] = {};
      }
      mapStack = []; // Reset map stack when entering new section
      i++;
      continue;
    }
    
    if (token.type === TokenType.IDENTIFIER) {
      const key = token.value;
      i++; // Move to type token
      
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
      
      if (typeInfo.value === 'map') {
        let mapObj = {};
        
        if (mapStack.length > 0) {
          const parentMap = mapStack[mapStack.length - 1];
          parentMap[key] = mapObj;
        } else if (currentSection) {
          result[currentSection][key] = mapObj;
        } else {
          result[key] = mapObj;
        }
        
        mapStack.push(mapObj);
        i++;
        continue;
      }
      
      if (typeInfo.value === 'list') {
        let listValue = '';
        while (i < tokens.length && 
               tokens[i].type !== TokenType.NEWLINE && 
               tokens[i].type !== TokenType.SECTION &&
               tokens[i].type !== TokenType.IDENTIFIER) {
          if (tokens[i].type !== TokenType.WHITESPACE) {
            listValue += tokens[i].value;
          }
          i++;
        }
        
        try {
          const value = converter.convert('list', listValue, envResolver);
          
          if (mapStack.length > 0) {
            const currentMap = mapStack[mapStack.length - 1];
            currentMap[key] = value;
          } else if (currentSection) {
            result[currentSection][key] = value;
          } else {
            result[key] = value;
          }
        } catch (error) {
          throw new Error(`Error converting list value for key '${key}': ${error.message}`);
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
      
      if (mapStack.length > 0) {
        const currentMap = mapStack[mapStack.length - 1];
        currentMap[key] = value;
      } else if (currentSection) {
        result[currentSection][key] = value;
      } else {
        result[key] = value;
      }
      
      i++; // Move to next token
      continue;
    }
    
    if (token.type === TokenType.MAP_END) {
      if (mapStack.length > 0) {
        mapStack.pop();
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
    
    throw new Error(`Unexpected token: ${token.type} with value '${token.value}'`);
  }
  
  return result;
}

module.exports = {
  parseMeta
};