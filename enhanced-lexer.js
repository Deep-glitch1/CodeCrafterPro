// enhanced-lexer.js
class ManualLexer {
    constructor(keywords = {}) {
        this.keywords = keywords;
    }

    // Main lexing function - completely manual
    tokenize(code) {
        const tokens = [];
        let pos = 0;
        let line = 1;
        let column = 1;
        let currentLineStart = 0;

        while (pos < code.length) {
            const char = code[pos];
            
            // Skip whitespace
            if (this.isWhitespace(char)) {
                if (char === '\n') {
                    line++;
                    column = 1;
                    currentLineStart = pos + 1;
                } else {
                    column++;
                }
                pos++;
                continue;
            }

            // Skip comments (single line)
            if (char === '/' && code[pos + 1] === '/') {
                while (pos < code.length && code[pos] !== '\n') {
                    pos++;
                    column++;
                }
                continue;
            }

            // Skip multi-line comments
            if (char === '/' && code[pos + 1] === '*') {
                pos += 2;
                column += 2;
                while (pos < code.length && !(code[pos] === '*' && code[pos + 1] === '/')) {
                    if (code[pos] === '\n') {
                        line++;
                        column = 1;
                        currentLineStart = pos + 1;
                    } else {
                        column++;
                    }
                    pos++;
                }
                if (pos < code.length) {
                    pos += 2;
                    column += 2;
                }
                continue;
            }

            // Preprocessor directives - tokenize entire line starting with #
            if (char === '#') {
                const startPos = pos;
                const startCol = column;
                let value = '';
                
                // Capture the entire preprocessor line
                while (pos < code.length && code[pos] !== '\n') {
                    value += code[pos];
                    pos++;
                    column++;
                }
                
                tokens.push({
                    type: 'PREPROCESSOR',
                    value: value,
                    line,
                    column: startCol,
                    start: startPos,
                    end: pos - 1
                });
                // When we hit newline, it will be handled by whitespace check
                continue;
            }

            // Numbers
            if (this.isDigit(char)) {
                const startPos = pos;
                const startCol = column;
                let value = '';
                let hasDecimal = false;
                
                while (pos < code.length && (this.isDigit(code[pos]) || code[pos] === '.')) {
                    if (code[pos] === '.') {
                        if (hasDecimal) break; // Multiple decimals
                        hasDecimal = true;
                    }
                    value += code[pos];
                    pos++;
                    column++;
                }
                
                tokens.push({
                    type: 'NUMBER',
                    value: parseFloat(value),
                    literal: value,
                    line,
                    column: startCol,
                    start: startPos,
                    end: pos - 1
                });
                continue;
            }

            // Strings
            if (char === '"' || char === "'") {
                const quote = char;
                const startCol = column;
                const startPos = pos;
                let value = '';
                
                pos++; // Skip opening quote
                column++;
                
                while (pos < code.length && code[pos] !== quote) {
                    // Handle escape sequences
                    if (code[pos] === '\\') {
                        pos++;
                        column++;
                        if (pos < code.length) {
                            switch (code[pos]) {
                                case 'n': value += '\n'; break;
                                case 't': value += '\t'; break;
                                case 'r': value += '\r'; break;
                                case quote: value += quote; break;
                                default: value += code[pos]; break;
                            }
                        }
                    } else {
                        value += code[pos];
                    }
                    pos++;
                    column++;
                }
                
                if (pos >= code.length) {
                    throw new Error(`Unterminated string at line ${line}, column ${startCol}`);
                }
                
                pos++; // Skip closing quote
                column++;
                
                tokens.push({
                    type: 'STRING',
                    value: value,
                    literal: quote + value + quote,
                    line,
                    column: startCol,
                    start: startPos,
                    end: pos - 1
                });
                continue;
            }

            // Identifiers and Keywords
            if (this.isLetter(char) || char === '_') {
                const startPos = pos;
                const startCol = column;
                let value = '';
                
                while (pos < code.length && (this.isLetterOrDigit(code[pos]) || code[pos] === '_')) {
                    value += code[pos];
                    pos++;
                    column++;
                }
                
                // Check if it's a keyword
                const keywordType = this.isKeyword(value);
                tokens.push({
                    type: keywordType || 'IDENTIFIER',
                    value: value,
                    line,
                    column: startCol,
                    start: startPos,
                    end: pos - 1
                });
                continue;
            }

            // Operators
            if (this.isOperatorStart(char)) {
                const startPos = pos;
                const startCol = column;
                let value = char;
                
                // Check for multi-character operators
                if (pos + 1 < code.length) {
                    const twoChar = char + code[pos + 1];
                    if (this.isTwoCharOperator(twoChar)) {
                        value = twoChar;
                        pos++;
                        column++;
                    }
                }
                
                tokens.push({
                    type: 'OPERATOR',
                    value: value,
                    line,
                    column: startCol,
                    start: startPos,
                    end: pos
                });
                
                pos++;
                column++;
                continue;
            }

            // Punctuation
            if (this.isPunctuation(char)) {
                tokens.push({
                    type: 'PUNCTUATION',
                    value: char,
                    line,
                    column,
                    start: pos,
                    end: pos
                });
                pos++;
                column++;
                continue;
            }

            // Unknown character
            throw new Error(`Unexpected character '${char}' at line ${line}, column ${column}`);
        }

        // Add EOF token
        tokens.push({
            type: 'EOF',
            value: '',
            line,
            column,
            start: pos,
            end: pos
        });

        return tokens;
    }

    // Helper methods
    isWhitespace(char) {
        return char === ' ' || char === '\t' || char === '\n' || char === '\r';
    }

    isDigit(char) {
        return char >= '0' && char <= '9';
    }

    isLetter(char) {
        return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
    }

    isLetterOrDigit(char) {
        return this.isLetter(char) || this.isDigit(char);
    }

    isKeyword(value) {
        // Convert to lowercase for case-insensitive keywords
        const lowerValue = value.toLowerCase();

        const keywordMap = this.getCustomKeywordMap();

        // Standard keywords (includes C, Python, and custom language keywords)
        const standardKeywords = {
            // Custom Language Keywords
            'if': 'IF',
            'else': 'ELSE',
            'while': 'WHILE',
            'for': 'FOR',
            'return': 'RETURN',
            'true': 'TRUE',
            'false': 'FALSE',
            'null': 'NULL',
            'undefined': 'UNDEFINED',
            'function': 'FUNCTION',
            'var': 'VAR',
            'let': 'LET',
            'const': 'CONST',
            'print': 'PRINT',
            'input': 'INPUT',
            
            // C/C++ Keywords
            'int': 'TYPE',
            'float': 'TYPE',
            'double': 'TYPE',
            'char': 'TYPE',
            'void': 'TYPE',
            'short': 'TYPE',
            'long': 'TYPE',
            'unsigned': 'TYPE',
            'signed': 'TYPE',
            'string': 'TYPE',
            'bool': 'TYPE',
            '#include': 'PREPROCESSOR',
            '#define': 'PREPROCESSOR',
            '#ifdef': 'PREPROCESSOR',
            'main': 'IDENTIFIER',
            'printf': 'FUNCTION',
            'scanf': 'FUNCTION',
            'sizeof': 'KEYWORD',
            'static': 'KEYWORD',
            'extern': 'KEYWORD',
            'register': 'KEYWORD',
            'auto': 'KEYWORD',
            'break': 'KEYWORD',
            'continue': 'KEYWORD',
            'default': 'KEYWORD',
            'switch': 'KEYWORD',
            'case': 'KEYWORD',
            'do': 'KEYWORD',
            'goto': 'KEYWORD',
            'struct': 'KEYWORD',
            'union': 'KEYWORD',
            'enum': 'KEYWORD',
            'typedef': 'KEYWORD',
            'inline': 'KEYWORD',
            
            // Python Keywords
            'def': 'FUNCTION',
            'class': 'KEYWORD',
            'import': 'KEYWORD',
            'from': 'KEYWORD',
            'as': 'KEYWORD',
            'with': 'KEYWORD',
            'try': 'KEYWORD',
            'except': 'KEYWORD',
            'finally': 'KEYWORD',
            'raise': 'KEYWORD',
            'assert': 'KEYWORD',
            'pass': 'KEYWORD',
            'del': 'KEYWORD',
            'in': 'KEYWORD',
            'is': 'KEYWORD',
            'and': 'KEYWORD',
            'or': 'KEYWORD',
            'not': 'KEYWORD',
            'lambda': 'KEYWORD',
            'yield': 'KEYWORD',
            'elif': 'KEYWORD',
            'global': 'KEYWORD',
            'nonlocal': 'KEYWORD'
        };

        return keywordMap[lowerValue] || standardKeywords[lowerValue] || null;
    }

    getCustomKeywordMap() {
        const keywords = this.keywords || {};
        const map = {};

        if (keywords.declare) map[keywords.declare.toLowerCase()] = 'VAR_DECLARE';
        if (keywords.print) map[keywords.print.toLowerCase()] = 'PRINT';
        if (keywords.if) map[keywords.if.toLowerCase()] = 'IF';
        if (keywords.else) map[keywords.else.toLowerCase()] = 'ELSE';
        if (keywords.while) map[keywords.while.toLowerCase()] = 'WHILE';

        // Fallback built-ins for custom language
        map['maano'] = map['maano'] || 'VAR_DECLARE';
        map['likho'] = map['likho'] || 'PRINT';
        map['agar'] = map['agar'] || 'IF';
        map['warna'] = map['warna'] || 'ELSE';
        map['jabtak'] = map['jabtak'] || 'WHILE';
        map['sahi'] = map['sahi'] || 'TRUE';
        map['galat'] = map['galat'] || 'FALSE';
        map['wapas'] = map['wapas'] || 'RETURN';
        map['karo'] = map['karo'] || 'DO';

        return map;
    }

    isOperatorStart(char) {
        return '+-*/%=!<>|&^~'.includes(char);
    }

    isTwoCharOperator(op) {
        return [
            '==', '!=', '<=', '>=', '&&', '||', '+=', '-=', '*=', '/=', '%=',
            '++', '--', '<<', '>>', '**'
        ].includes(op);
    }

    isPunctuation(char) {
        return '(){}[],;:.'.includes(char);
    }
}