/**
 * Parser module for .meta files
 * Handles parsing of the custom configuration language into JavaScript objects
 * Production-ready with enhanced features for .env replacement
 */

const { TokenType, tokenize } = require('./tokenizer');
const { TypeConverter } = require('./type-converter');
const { EnvironmentResolver } = require('./environment-resolver');

/**
 * Parses a .meta formatted string into a JavaScript object
 * @param {string} text - The .meta file content as a string
 * @param {Object} options - Parsing options
 * @param {boolean} options.strictEnv - Throw error if env vars are missing
 * @param {boolean} options.warnOnMissing - Warn if env vars are missing
 * @param {boolean} options.validateRequired - Validate required fields
 * @param {string} options.defaultEnv - Default environment name
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
  const requiredFields = []; // Track required fields for validation
  
  while (i < tokens.length) {
    const token = tokens[i];
    
    if (token.type === TokenType.SECTION) {
      const sectionValue = token.value.trim();
      
      // Handle @common section
      if (sectionValue === 'common' || sectionValue === '@common') {
        currentSection = 'common';
        if (!result.common) {
          result.common = {};
        }
        // Don't overwrite, allow merging multiple @common blocks
      }
      // Handle @env <name> sections
      else if (sectionValue.startsWith('env ') || sectionValue.startsWith('@env ')) {
        const envName = sectionValue.replace(/^@?env\s+/, ''); // Remove "env " or "@env " prefix
        currentSection = envName;
        // Don't overwrite existing section, allow merging multiple @env blocks
        if (!result[currentSection]) {
          result[currentSection] = {};
        }
      }
      // Handle regular sections (with or without @)
      else {
        // Remove @ prefix if present
        currentSection = sectionValue.startsWith('@') ? sectionValue.substring(1) : sectionValue;
        // Don't overwrite existing section, allow merging multiple blocks
        if (!result[currentSection]) {
          result[currentSection] = {};
        }
      }
      
      mapStack = []; // Reset map stack when entering new section
      i++;
      continue;
    }
    
    // Handle section-like tokens that might be parsed as VALUE
    // Check if this is a section declaration without @
    if (token.type === TokenType.IDENTIFIER) {
      const nextToken = i + 1 < tokens.length ? tokens[i + 1] : null;
      
      // If next token is NEWLINE and current token looks like a section name
      if (nextToken && nextToken.type === TokenType.NEWLINE) {
        const tokenValue = token.value.toLowerCase();
        
        // Check if it's "common" without @
        if (tokenValue === 'common') {
          currentSection = 'common';
          if (!result.common) {
            result.common = {};
          }
          mapStack = [];
          i++;
          continue;
        }
        
        // Check if it's "env <name>" without @
        if (tokenValue === 'env' && i + 2 < tokens.length) {
          const envNameToken = tokens[i + 2];
          if (envNameToken && envNameToken.type === TokenType.IDENTIFIER) {
            currentSection = envNameToken.value;
            result[currentSection] = {};
            mapStack = [];
            i += 3; // Skip "env", whitespace, and env name
            continue;
          }
        }
      }
    }
    
    if (token.type === TokenType.IDENTIFIER) {
      const key = token.value;
      i++; // Move to type token
      
      // Skip whitespace and newlines
      while (i < tokens.length && 
             (tokens[i].type === TokenType.WHITESPACE || 
              tokens[i].type === TokenType.NEWLINE)) {
        i++;
      }
      
      if (i >= tokens.length || tokens[i].type !== TokenType.TYPE) {
        // If no type found, this might be a section name or invalid syntax
        // Check if next token is a section or newline
        if (i < tokens.length && 
            (tokens[i].type === TokenType.SECTION || 
             tokens[i].type === TokenType.NEWLINE)) {
          // This identifier might be a section name without @, skip it
          i++;
          continue;
        }
        throw new Error(`Expected type declaration after key '${key}'`);
      }
      
      const typeInfo = tokens[i];
      i++; // Move to value token
      
      // Check for required/optional modifiers
      let isRequired = false;
      let hasDefault = false;
      let defaultValue = null;
      
      // Look ahead for modifiers
      let lookAhead = i;
      while (lookAhead < tokens.length && 
             (tokens[lookAhead].type === TokenType.WHITESPACE || 
              tokens[lookAhead].type === TokenType.NEWLINE)) {
        lookAhead++;
      }
      
      // Check for required/optional keywords
      if (lookAhead < tokens.length && tokens[lookAhead].type === TokenType.IDENTIFIER) {
        const modifier = tokens[lookAhead].value.toLowerCase();
        if (modifier === 'required') {
          isRequired = true;
          lookAhead++;
          // Track required fields
          if (currentSection) {
            requiredFields.push({ section: currentSection, key });
          }
        } else if (modifier === 'optional') {
          isRequired = false;
          lookAhead++;
        } else if (modifier === 'default') {
          hasDefault = true;
          lookAhead++;
          // Skip whitespace
          while (lookAhead < tokens.length && 
                 (tokens[lookAhead].type === TokenType.WHITESPACE || 
                  tokens[lookAhead].type === TokenType.NEWLINE)) {
            lookAhead++;
          }
          // Get default value
          if (lookAhead < tokens.length && 
              (tokens[lookAhead].type === TokenType.VALUE || 
               tokens[lookAhead].type === TokenType.ENV_VAR)) {
            defaultValue = tokens[lookAhead].value;
            lookAhead++;
          }
        }
      }
      
      // Skip whitespace before value
      while (i < tokens.length && 
             (tokens[i].type === TokenType.WHITESPACE || 
              tokens[i].type === TokenType.NEWLINE)) {
        i++;
      }
      
      // Skip modifiers we already processed
      if (i < lookAhead) {
        i = lookAhead;
        // Skip whitespace again
        while (i < tokens.length && 
               (tokens[i].type === TokenType.WHITESPACE || 
                tokens[i].type === TokenType.NEWLINE)) {
          i++;
        }
      }
      
      if (i >= tokens.length) {
        // If we have a default, use it
        if (hasDefault && defaultValue !== null) {
          // Process default value
        } else if (isRequired && options.validateRequired) {
          throw new Error(`Required field '${key}' in section '${currentSection || 'root'}' has no value`);
        } else {
          // Optional field with no value - skip
          continue;
        }
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
      
      // Use default value if no value provided
      let valueToken = null;
      
      // Skip whitespace and newlines before value
      while (i < tokens.length && 
             (tokens[i].type === TokenType.WHITESPACE || 
              tokens[i].type === TokenType.NEWLINE)) {
        i++;
      }
      
      if (i < tokens.length && 
          (tokens[i].type === TokenType.VALUE || tokens[i].type === TokenType.ENV_VAR)) {
        valueToken = tokens[i];
      } else if (hasDefault && defaultValue !== null) {
        // Create a synthetic token for default value
        valueToken = { type: defaultValue.startsWith('$ENV(') ? TokenType.ENV_VAR : TokenType.VALUE, value: defaultValue };
      } else if (i < tokens.length && tokens[i].type === TokenType.SECTION) {
        // Next token is a section, so this key has no value - skip it
        continue;
      } else if (i < tokens.length && tokens[i].type === TokenType.IDENTIFIER) {
        // IDENTIFIER after TYPE should be treated as a value (e.g., URLs like https://...)
        // We need to reconstruct the value from the original text since the tokenizer
        // may have consumed colons and other characters
        // For now, collect tokens and handle special cases
        let valueParts = [tokens[i].value];
        let valueIndex = i + 1;
        
        // Look ahead to see if this might be a URL or value with special characters
        // Check if next token after whitespace is TYPE (which means there was a colon)
        let lookAheadIndex = valueIndex;
        while (lookAheadIndex < tokens.length && 
               (tokens[lookAheadIndex].type === TokenType.WHITESPACE)) {
          lookAheadIndex++;
        }
        
        // If we see a TYPE token, it means there was a colon that got consumed
        // We need to reconstruct: identifier + ":" + type + rest
        if (lookAheadIndex < tokens.length && tokens[lookAheadIndex].type === TokenType.TYPE) {
          // This is likely a URL or value with colon - reconstruct it
          valueParts.push(':'); // Add the colon
          // Skip the TYPE token (it's not actually a type, it's part of the value)
          lookAheadIndex++;
          // Continue collecting
          valueIndex = lookAheadIndex;
        }
        
        // Skip whitespace
        while (valueIndex < tokens.length && 
               (tokens[valueIndex].type === TokenType.WHITESPACE)) {
          valueIndex++;
        }
        
        // Collect all tokens until newline or section
        while (valueIndex < tokens.length && 
               tokens[valueIndex].type !== TokenType.NEWLINE &&
               tokens[valueIndex].type !== TokenType.SECTION &&
               tokens[valueIndex].type !== TokenType.COMMENT) {
          if (tokens[valueIndex].type === TokenType.WHITESPACE) {
            valueParts.push(' ');
          } else if (tokens[valueIndex].type === TokenType.TYPE) {
            // TYPE token in value context means it was part of the value (like in URLs)
            // Don't add it, it was already handled above
            valueIndex++;
            continue;
          } else {
            valueParts.push(tokens[valueIndex].value);
          }
          valueIndex++;
        }
        
        const combinedValue = valueParts.join('');
        valueToken = { type: TokenType.VALUE, value: combinedValue };
        i = valueIndex - 1; // Will be incremented at end of loop
      } else if (isRequired && options.validateRequired) {
        throw new Error(`Required field '${key}' in section '${currentSection || 'root'}' has no value`);
      } else {
        // Optional field with no value - skip
        continue;
      }
      
      let value = valueToken.value;
      
      try {
        value = converter.convert(typeInfo.value, value, envResolver);
        
        // Validate required fields
        if (isRequired && options.validateRequired) {
          if (value === null || value === undefined || value === '') {
            throw new Error(`Required field '${key}' in section '${currentSection || 'root'}' cannot be empty`);
          }
        }
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
    
    // Skip empty TYPE tokens (shouldn't happen, but handle gracefully)
    if (token.type === TokenType.TYPE && (!token.value || token.value.trim() === '')) {
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