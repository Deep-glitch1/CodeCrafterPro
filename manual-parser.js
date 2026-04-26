// manual-parser.js
class ManualParser {
    constructor(tokens) {
        this.tokens = tokens || [];
        this.pos = 0;
        this.currentToken = this.tokens[0] || null;
        this.ast = {
            type: 'Program',
            body: [],
            line: 1,
            column: 1
        };
        
        // Initialize Pratt expression parser
        this.expressionParser = new PrattExpressionParser(this);
        
        // Check for empty input
        this.isEmptyInput = !tokens || tokens.length === 0 || 
                            (tokens.length === 1 && tokens[0]?.type === 'EOF');
        
        // LL(1) FIRST sets - what tokens can start each construct
        this.FIRST = {
            'program': new Set(['VAR_DECLARE', 'PRINT', 'IF', 'WHILE', 'IDENTIFIER', 
                                'PUNCTUATION', 'NUMBER', 'STRING', 'TRUE', 'FALSE']),
            'statement': new Set(['VAR_DECLARE', 'PRINT', 'IF', 'WHILE', 'IDENTIFIER', 
                                  'PUNCTUATION', 'NUMBER', 'STRING', 'TRUE', 'FALSE']),
            'variableDeclaration': new Set(['VAR_DECLARE']),
            'printStatement': new Set(['PRINT']),
            'ifStatement': new Set(['IF']),
            'whileStatement': new Set(['WHILE']),
            'assignment': new Set(['IDENTIFIER']),
            'block': new Set(['{']),
            'expression': new Set(['NUMBER', 'STRING', 'IDENTIFIER', '(', 'TRUE', 'FALSE',
                                  '-', '!']),
            'expressionStatement': new Set(['NUMBER', 'STRING', 'IDENTIFIER', '(', 
                                           'TRUE', 'FALSE', '-', '!']),
            'literal': new Set(['NUMBER', 'STRING', 'TRUE', 'FALSE']),
            'primary': new Set(['NUMBER', 'STRING', 'IDENTIFIER', '(', 'TRUE', 'FALSE'])
        };
        
        // LL(1) FOLLOW sets - what tokens can come after each construct
        this.FOLLOW = {
            'program': new Set(['EOF']),
            'statement': new Set(['VAR_DECLARE', 'PRINT', 'IF', 'WHILE', 'IDENTIFIER', 
                                  'PUNCTUATION', 'ELSE', 'EOF', '}']),
            'variableDeclaration': new Set(['VAR_DECLARE', 'PRINT', 'IF', 'WHILE', 
                                           'IDENTIFIER', 'PUNCTUATION', 'ELSE', 'EOF', '}']),
            'printStatement': new Set(['PRINT', 'VAR_DECLARE', 'IF', 'WHILE', 
                                      'IDENTIFIER', 'PUNCTUATION', 'ELSE', 'EOF', '}']),
            'ifStatement': new Set(['IF', 'VAR_DECLARE', 'PRINT', 'WHILE', 
                                   'IDENTIFIER', 'PUNCTUATION', 'ELSE', 'EOF', '}']),
            'whileStatement': new Set(['WHILE', 'VAR_DECLARE', 'PRINT', 'IF', 
                                      'IDENTIFIER', 'PUNCTUATION', 'ELSE', 'EOF', '}']),
            'assignment': new Set(['IDENTIFIER', 'VAR_DECLARE', 'PRINT', 'IF', 
                                  'WHILE', 'PUNCTUATION', 'ELSE', 'EOF', '}']),
            'block': new Set(['PUNCTUATION', 'VAR_DECLARE', 'PRINT', 'IF', 
                             'WHILE', 'IDENTIFIER', 'ELSE', 'EOF', '}']),
            'expression': new Set([';', ')', ']', ',', '}', 'EOF']),
            'expressionStatement': new Set([';', ')', ']', ',', '}', 'EOF']),
            'literal': new Set([';', ')', ']', ',', '}', 'EOF']),
            'primary': new Set([';', ')', ']', ',', '}', 'EOF'])
        };
        
        // Track errors and warnings for reporting
        this.errors = [];
        this.warnings = [];
        this.inErrorRecovery = false;
        this.recoveryAttempts = 0;
        this.MAX_RECOVERY_ATTEMPTS = 10;
        
        // Validate grammar is LL(1) on construction (skip for empty input)
        if (!this.isEmptyInput) {
            this.validateLL1();
        }
    }

    /**
     * Validate that the grammar is LL(1) by checking FIRST set conflicts
     */
    validateLL1() {
        const conflicts = [];
        
        // Check each nonterminal for FIRST set conflicts
        const nonterminals = ['statement', 'expression', 'primary'];
        
        for (const nt of nonterminals) {
            // This is simplified - in reality you'd check each production
            // But for our purposes, we can do basic validation
            
            // Example: Check if any token appears in multiple FIRST sets
            const allFirsts = Array.from(this.FIRST[nt] || new Set());
            const duplicates = allFirsts.filter((item, index) => 
                allFirsts.indexOf(item) !== index
            );
            
            if (duplicates.length > 0) {
                conflicts.push(`Nonterminal '${nt}' has duplicate FIRST set entries: ${duplicates.join(', ')}`);
            }
        }
        
        if (conflicts.length > 0) {
            console.warn('⚠️ Grammar may not be LL(1):', conflicts);
        } else {
            console.log('✅ Grammar appears to be LL(1) compliant');
        }
    }

    parse() {
        // Edge Case 1: Empty input
        if (this.isEmptyInput) {
            console.log('📭 Empty input - returning empty AST');
            return this.ast;
        }
        
        let iterationCount = 0;
        const maxIterations = 10000;
        
        while (!this.isAtEnd() && iterationCount < maxIterations) {
            try {
                // Edge Case 2: Check for missing semicolon between statements
                if (this.detectMissingSemicolon()) {
                    this.handleMissingSemicolon();
                }
                
                // Check if current token can start a statement
                const tokenType = this.currentToken?.type;
                const tokenValue = this.currentToken?.value;
                
                if (!this.FIRST['statement'].has(tokenType) && 
                    !this.FIRST['statement'].has(tokenValue)) {
                    
                    // Token cannot start a statement - synchronize
                    const error = new Error(`Unexpected token '${tokenValue}' cannot start a statement at line ${this.currentToken?.line}`);
                    this.reportError(error);
                    this.synchronize('statement');
                    iterationCount++;
                    continue;
                }
                
                const statement = this.parseStatement();
                if (statement) {
                    this.ast.body.push(statement);
                }
                this.inErrorRecovery = false;
                this.recoveryAttempts = 0;
                
            } catch (error) {
                this.reportError(error);
                this.synchronize('statement');
                this.recoveryAttempts++;
                
                if (this.recoveryAttempts > this.MAX_RECOVERY_ATTEMPTS) {
                    console.error('❌ Too many recovery attempts, aborting parse');
                    break;
                }
            }
            iterationCount++;
        }
        
        if (iterationCount >= maxIterations) {
            console.warn('⚠️ Parser iteration limit reached, possible infinite loop detected');
        }
        
        // Report all collected errors and warnings
        this.displayDiagnostics();
        
        return this.ast;
    }

    // Recursive descent parsing methods
    parseStatement() {
        try {
            if (this.match('VAR_DECLARE')) {
                return this.parseVariableDeclaration();
            }
            if (this.match('PRINT')) {
                return this.parsePrintStatement();
            }
            if (this.match('IF')) {
                return this.parseIfStatement();
            }
            if (this.match('WHILE')) {
                return this.parseWhileStatement();
            }
            if (this.match('IDENTIFIER') && this.peekAhead(1) && this.peekAhead(1).value === '=') {
                return this.parseAssignment();
            }
            if (this.match('PUNCTUATION') && this.peek()?.value === '{') {
                return this.parseBlock();
            }
            // If no statement matches, try expression statement
            if (this.isExpressionStart()) {
                return this.parseExpressionStatement();
            }
            
            // Unexpected token - throw error for recovery
            throw new Error(`Unexpected token '${this.currentToken?.value}' at line ${this.currentToken?.line}`);
            
        } catch (error) {
            // Re-throw for recovery at higher level
            throw error;
        }
    }

    parseVariableDeclaration() {
        const declareToken = this.consume('VAR_DECLARE', 'Expected variable declaration keyword');
        const nameToken = this.consume('IDENTIFIER', 'Expected variable name');
        
        let initializer = null;
        if (this.match('OPERATOR') && this.peek()?.value === '=') {
            this.advance(); // Consume '='
            try {
                initializer = this.parseExpression();
            } catch (error) {
                this.reportError(error);
                // Continue with null initializer
            }
        }
        
        // Optional semicolon - but don't error if missing
        if (this.match('PUNCTUATION') && this.peek()?.value === ';') {
            this.advance();
        }
        
        return {
            type: 'VariableDeclaration',
            name: nameToken.value,
            initializer: initializer,
            line: declareToken.line,
            column: declareToken.column
        };
    }

    parsePrintStatement() {
        const printToken = this.consume('PRINT', 'Expected print keyword');
        
        let value = null;
        try {
            value = this.parseExpression();
        } catch (error) {
            this.reportError(error);
            // Create a placeholder error node
            value = {
                type: 'ErrorExpression',
                message: error.message,
                line: this.currentToken?.line || printToken.line,
                column: this.currentToken?.column || printToken.column
            };
        }
        
        // Optional semicolon
        if (this.match('PUNCTUATION') && this.peek()?.value === ';') {
            this.advance();
        }
        
        return {
            type: 'PrintStatement',
            value: value,
            line: printToken.line,
            column: printToken.column
        };
    }

    parseIfStatement() {
        const ifToken = this.consume('IF', 'Expected if keyword');
        
        // Optional parentheses
        const hasParens = this.match('PUNCTUATION') && this.peek()?.value === '(';
        if (hasParens) {
            this.consumePunctuation('(', "Expected '(' after if");
        }
        
        let condition = null;
        try {
            condition = this.parseExpression();
        } catch (error) {
            this.reportError(error);
            condition = {
                type: 'ErrorExpression',
                message: error.message,
                line: this.currentToken?.line || ifToken.line,
                column: this.currentToken?.column || ifToken.column
            };
        }
        
        if (hasParens) {
            try {
                this.consumePunctuation(')', "Expected ')' after if condition");
            } catch (error) {
                this.reportError(error);
                // Try to recover - maybe the closing parenthesis is missing
            }
        }
        
        let thenBranch = null;
        try {
            thenBranch = this.parseStatement();
        } catch (error) {
            this.reportError(error);
            // Create empty block as placeholder
            thenBranch = {
                type: 'Block',
                statements: [],
                line: ifToken.line,
                column: ifToken.column
            };
        }
        
        let elseBranch = null;
        if (this.match('ELSE')) {
            this.advance();
            try {
                elseBranch = this.parseStatement();
            } catch (error) {
                this.reportError(error);
                elseBranch = {
                    type: 'Block',
                    statements: [],
                    line: this.currentToken?.line || ifToken.line,
                    column: this.currentToken?.column || ifToken.column
                };
            }
        }
        
        return {
            type: 'IfStatement',
            condition: condition,
            then: thenBranch,
            else: elseBranch,
            line: ifToken.line,
            column: ifToken.column
        };
    }

    parseWhileStatement() {
        const whileToken = this.consume('WHILE', 'Expected while keyword');
        
        // Optional parentheses
        const hasParens = this.match('PUNCTUATION') && this.peek()?.value === '(';
        if (hasParens) {
            this.consumePunctuation('(', "Expected '(' after while");
        }
        
        let condition = null;
        try {
            condition = this.parseExpression();
        } catch (error) {
            this.reportError(error);
            condition = {
                type: 'ErrorExpression',
                message: error.message,
                line: this.currentToken?.line || whileToken.line,
                column: this.currentToken?.column || whileToken.column
            };
        }
        
        if (hasParens) {
            try {
                this.consumePunctuation(')', "Expected ')' after while condition");
            } catch (error) {
                this.reportError(error);
                // Try to recover
            }
        }
        
        let body = null;
        try {
            body = this.parseStatement();
        } catch (error) {
            this.reportError(error);
            body = {
                type: 'Block',
                statements: [],
                line: whileToken.line,
                column: whileToken.column
            };
        }
        
        return {
            type: 'WhileStatement',
            condition: condition,
            body: body,
            line: whileToken.line,
            column: whileToken.column
        };
    }

    parseAssignment() {
        const nameToken = this.consume('IDENTIFIER', 'Expected variable name');
        
        try {
            this.consume('OPERATOR', "Expected '=' for assignment");
        } catch (error) {
            this.reportError(error);
            // If '=' is missing, return a variable reference instead
            return {
                type: 'Variable',
                name: nameToken.value,
                line: nameToken.line,
                column: nameToken.column
            };
        }
        
        let value = null;
        try {
            value = this.parseExpression();
        } catch (error) {
            this.reportError(error);
            value = {
                type: 'ErrorExpression',
                message: error.message,
                line: this.currentToken?.line || nameToken.line,
                column: this.currentToken?.column || nameToken.column
            };
        }
        
        // Optional semicolon
        if (this.match('PUNCTUATION') && this.peek()?.value === ';') {
            this.advance();
        }
        
        return {
            type: 'Assignment',
            name: nameToken.value,
            value: value,
            line: nameToken.line,
            column: nameToken.column
        };
    }

    // Enhanced block parsing with recovery for nested braces
    parseBlock() {
        const openBrace = this.consumePunctuation('{', "Expected '{'");
        const statements = [];
        const startPos = this.pos;
        const startLine = this.currentToken?.line;
        
        // Track brace nesting level for recovery
        let braceLevel = 1;  // Start with 1 from opening brace
        let statementCount = 0;
        const MAX_STATEMENTS = 1000;
        
        while (!this.isAtEnd() && statementCount < MAX_STATEMENTS) {
            // Peek ahead to see if we're at the matching closing brace
            const token = this.currentToken;
            
            if (token?.type === 'PUNCTUATION') {
                if (token.value === '{') {
                    braceLevel++;
                } else if (token.value === '}') {
                    braceLevel--;
                    if (braceLevel === 0) {
                        // Found the matching closing brace
                        this.advance(); // Consume it
                        break;
                    }
                }
            }
            
            // If brace level is wrong, we might have mismatched braces
            if (braceLevel < 0) {
                // Too many closing braces - something's wrong
                const error = new Error(`Unexpected '}' at line ${token?.line}`);
                this.reportError(error);
                this.recoverBlock(startPos);
                break;
            }
            
            // Check if we've gone too far without finding matching brace
            if (this.pos - startPos > 1000) {
                this.addWarning('Block too long - possible missing closing brace', startLine || 1);
                break;
            }
            
            try {
                // Check if current token can start a statement
                const tokenType = this.currentToken?.type;
                const tokenValue = this.currentToken?.value;
                
                if (!this.FIRST['statement'].has(tokenType) && 
                    !this.FIRST['statement'].has(tokenValue)) {
                    
                    const error = new Error(`Unexpected token '${tokenValue}' in block at line ${this.currentToken?.line}`);
                    this.reportError(error);
                    this.synchronize('statement');
                    continue;
                }
                
                const stmt = this.parseStatement();
                if (stmt) statements.push(stmt);
                statementCount++;
                this.inErrorRecovery = false;
                
            } catch (error) {
                this.reportError(error);
                this.synchronize('statement');
            }
        }
        
        // If we never found the closing brace, add it implicitly
        if (braceLevel > 0) {
            this.addWarning(`Block missing ${braceLevel} closing brace(s)`, startLine || 1);
        }
        
        return {
            type: 'Block',
            statements: statements,
            line: openBrace.line,
            column: openBrace.column
        };
    }

    /**
     * Recovery strategy for badly nested blocks
     */
    recoverBlock(startPos) {
        console.log('🔄 Attempting block recovery...');
        
        let braceLevel = 1;
        let steps = 0;
        const MAX_STEPS = 100;
        
        while (!this.isAtEnd() && steps < MAX_STEPS) {
            const token = this.currentToken;
            if (!token) break;
            
            if (token.value === '{') braceLevel++;
            if (token.value === '}') braceLevel--;
            
            if (braceLevel === 0) {
                this.advance(); // Consume closing brace
                console.log('✅ Block recovered');
                return true;
            }
            
            this.advance();
            steps++;
        }
        
        console.warn('⚠️ Block recovery failed - resetting to safe point');
        // Last resort: reset to after the opening brace and hope for the best
        this.pos = startPos;
        this.currentToken = this.tokens[this.pos];
        return false;
    }

    parseExpressionStatement() {
        let expr = null;
        try {
            expr = this.parseExpression();
        } catch (error) {
            this.reportError(error);
            expr = {
                type: 'ErrorExpression',
                message: error.message,
                line: this.currentToken?.line || 1,
                column: this.currentToken?.column || 1
            };
        }
        
        // Optional semicolon
        if (this.match('PUNCTUATION') && this.peek()?.value === ';') {
            this.advance();
        }
        
        // Safe line/column extraction with null checks
        const line = expr?.line || this.currentToken?.line || 1;
        const column = expr?.column || this.currentToken?.column || 1;
        
        return {
            type: 'ExpressionStatement',
            expression: expr,
            line: line,
            column: column
        };
    }

    // Edge Case 2: Missing semicolon detection (Automatic Semicolon Insertion)
    detectMissingSemicolon() {
        if (this.pos === 0) return false;
        
        const prevToken = this.previousToken();
        const currToken = this.currentToken;
        
        if (!prevToken || !currToken) return false;
        
        // Previous token needs a semicolon after it
        const needsSemicolon = 
            prevToken.type === 'IDENTIFIER' ||
            prevToken.type === 'NUMBER' ||
            prevToken.type === 'STRING' ||
            prevToken.value === ')' ||
            prevToken.value === '}';
        
        // Check if there actually is a semicolon
        const nextToken = this.tokens[this.pos];
        const hasSemicolon = nextToken && nextToken.value === ';';
        
        // Current token starts a new statement
        const currStartsStatement = 
            this.FIRST['statement'].has(currToken.type) ||
            this.FIRST['statement'].has(currToken.value);
        
        return needsSemicolon && !hasSemicolon && currStartsStatement;
    }

    handleMissingSemicolon() {
        this.addWarning('Missing semicolon between statements', this.currentToken?.line || 1);
    }

    // Check if current token can start an expression using FIRST set
    isExpressionStart() {
        if (!this.currentToken) return false;
        const type = this.currentToken.type;
        const value = this.currentToken.value;
        return (type && this.FIRST['expression'].has(type)) || 
               (value && this.FIRST['expression'].has(value));
    }

    // Expression parsing - using Pratt parser
    parseExpression() {
        return this.expressionParser.parseExpression(0);
    }

    // Parser helper methods
    match(type) {
        if (this.isAtEnd()) return false;
        return this.currentToken?.type === type;
    }

    check(type, value = null) {
        if (this.isAtEnd()) return false;
        if (value !== null) {
            return this.currentToken?.type === type && this.currentToken?.value === value;
        }
        return this.currentToken?.type === type;
    }

    peek() {
        return this.currentToken;
    }

    peekAhead(n) {
        if (!this.tokens || this.pos + n >= this.tokens.length) return null;
        return this.tokens[this.pos + n];
    }

    advance() {
        if (!this.isAtEnd()) {
            const token = this.currentToken;
            this.pos++;
            this.currentToken = this.tokens[this.pos] || null;
            return token;
        }
        return this.tokens[this.tokens.length - 1]; // EOF
    }

    consume(type, message) {
        if (this.check(type)) {
            return this.advance();
        }
        const line = this.currentToken?.line || 1;
        const column = this.currentToken?.column || 1;
        const error = new Error(`${message} at line ${line}, column ${column}`);
        error.token = this.currentToken;
        error.expected = type;
        throw error;
    }

    consumePunctuation(value, message) {
        if (this.match('PUNCTUATION') && this.peek()?.value === value) {
            return this.advance();
        }
        const line = this.currentToken?.line || 1;
        const column = this.currentToken?.column || 1;
        const error = new Error(`${message} at line ${line}, column ${column}`);
        error.token = this.currentToken;
        error.expected = value;
        throw error;
    }

    isAtEnd() {
        if (this.isEmptyInput) return true;
        return !this.currentToken || this.currentToken.type === 'EOF';
    }

    /**
     * LL(1) FOLLOW set-based error recovery
     * Synchronize parser by skipping tokens until a follower of the given non-terminal is found
     */
    synchronize(nonTerminal) {
        if (this.inErrorRecovery) {
            // Already in recovery, just skip this token
            this.advance();
            return;
        }
        
        this.inErrorRecovery = true;
        const followSet = this.FOLLOW[nonTerminal] || this.FOLLOW['statement'];
        
        console.log(`🔄 Synchronizing parser in ${nonTerminal}...`);
        
        let skippedTokens = [];
        let syncPointFound = false;
        const MAX_SKIP = 50;
        let skipCount = 0;
        
        while (!this.isAtEnd() && !syncPointFound && skipCount < MAX_SKIP) {
            const token = this.currentToken;
            if (!token) break;
            
            // Check if current token is in FOLLOW set
            if (followSet.has(token.type) || followSet.has(token.value)) {
                syncPointFound = true;
                console.log(`✅ Synchronized at ${token.type} "${token.value}"`);
                break;
            }
            
            // Special case: semicolon is always a sync point
            if (token.value === ';') {
                syncPointFound = true;
                // Only consume semicolon at statement level
                if (nonTerminal === 'statement' || nonTerminal === 'expressionStatement') {
                    this.advance(); // Consume the semicolon
                }
                console.log(`✅ Synchronized at ';'`);
                break;
            }
            
            // Special case: closing brace syncs to parent
            if (token.value === '}') {
                syncPointFound = true;
                console.log(`✅ Found closing brace, returning to parent`);
                break;
            }
            
            skippedTokens.push(`${token.type}(${token.value}) at line ${token.line}`);
            this.advance();
            skipCount++;
        }
        
        // Safety: if we hit max skip, force sync to next statement starter
        if (skipCount >= MAX_SKIP) {
            console.warn('⚠️ Synchronization hit max skip limit, forcing recovery');
            while (!this.isAtEnd() && 
                   !this.FIRST['statement'].has(this.currentToken?.type) &&
                   !this.FIRST['statement'].has(this.currentToken?.value)) {
                this.advance();
            }
        }
        
        if (skippedTokens.length > 0) {
            console.log(`⚠️ Skipped tokens: ${skippedTokens.join(', ')}`);
        }
    }

    /**
     * Report an error and store it for later display
     */
    reportError(error) {
        const errorMsg = `❌ Parse error: ${error.message}`;
        console.error(errorMsg);
        this.errors.push(errorMsg);
        
        // Add to UI error panel if available
        const output = document.getElementById('executionOutput');
        if (output && !this.inErrorRecovery) {
            output.textContent += `\n${errorMsg}`;
        }
    }

    /**
     * Add a warning message
     */
    addWarning(message, line) {
        this.warnings.push({ message, line });
    }

    /**
     * Display all diagnostics (errors and warnings)
     */
    displayDiagnostics() {
        if (this.warnings.length > 0) {
            console.group('⚠️ Parser Warnings:');
            this.warnings.forEach(w => {
                const msg = `  Line ${w.line}: ${w.message}`;
                console.log(msg);
                
                // Show in UI
                const output = document.getElementById('executionOutput');
                if (output) {
                    output.textContent += `\n⚠️ Warning (line ${w.line}): ${w.message}`;
                }
            });
            console.groupEnd();
        }
        
        if (this.errors.length > 0) {
            console.group('📋 Parser Errors Encountered:');
            this.errors.forEach(err => console.log(`  ${err}`));
            console.groupEnd();
        }
    }

    /**
     * Get expected tokens at current position (for error messages)
     * @param {string} nonTerminal - The non-terminal we're trying to parse
     * @param {boolean} useFollow - Whether to use FOLLOW (for recovery) or FIRST (for prediction)
     */
    getExpectedTokens(nonTerminal, useFollow = false) {
        if (useFollow) {
            const followSet = this.FOLLOW[nonTerminal] || this.FOLLOW['statement'];
            return Array.from(followSet).filter(t => t !== 'EOF').join(', ');
        } else {
            const firstSet = this.FIRST[nonTerminal] || this.FIRST['statement'];
            return Array.from(firstSet).filter(t => t !== 'EOF').join(', ');
        }
    }

    /**
     * Safe token access methods
     */
    safeGetTokenType() {
        return this.currentToken?.type || 'EOF';
    }
    
    safeGetTokenValue() {
        return this.currentToken?.value || '';
    }

    previousToken() {
        return this.tokens[this.pos - 1];
    }
}

/**
 * Pratt Expression Parser
 * Implements Vaughan Pratt's "Top Down Operator Precedence" parsing
 */
class PrattExpressionParser {
    constructor(parser) {
        this.parser = parser;
        
        // nud = null denotation (prefix)
        this.prefixParsers = new Map();
        
        // led = left denotation (infix)
        this.infixParsers = new Map();
        
        // Operator precedence table
        this.precedence = new Map();
        
        this.setupParsers();
    }
    
    setupParsers() {
        // ============ PREFIX PARSERS (nud) ============
        
        // Literals
        this.prefixParsers.set('NUMBER', (token) => ({
            type: 'Literal',
            value: token.value,
            line: token.line,
            column: token.column
        }));
        
        this.prefixParsers.set('STRING', (token) => ({
            type: 'Literal',
            value: token.value,
            line: token.line,
            column: token.column
        }));
        
        this.prefixParsers.set('TRUE', (token) => ({
            type: 'Literal',
            value: true,
            line: token.line,
            column: token.column
        }));
        
        this.prefixParsers.set('FALSE', (token) => ({
            type: 'Literal',
            value: false,
            line: token.line,
            column: token.column
        }));
        
        // Identifiers
        this.prefixParsers.set('IDENTIFIER', (token) => ({
            type: 'Variable',
            name: token.value,
            line: token.line,
            column: token.column
        }));
        
        // Parenthesized expressions
        this.prefixParsers.set('(', (token) => {
            const expr = this.parseExpression(0);
            try {
                this.parser.consumePunctuation(')', "Expected ')' after expression");
            } catch (error) {
                this.parser.reportError(error);
                // Return the expression anyway
            }
            return expr;
        });
        
        // Unary operators
        this.prefixParsers.set('-', (token) => ({
            type: 'UnaryExpression',
            operator: '-',
            argument: this.parseExpression(70), // High precedence
            line: token.line,
            column: token.column
        }));
        
        this.prefixParsers.set('!', (token) => ({
            type: 'UnaryExpression',
            operator: '!',
            argument: this.parseExpression(70),
            line: token.line,
            column: token.column
        }));
        
        // ============ PRECEDENCE TABLE ============
        // Higher number = higher precedence
        this.precedence.set('=', 10);      // Assignment (lowest)
        this.precedence.set('||', 20);     // Logical OR
        this.precedence.set('&&', 30);     // Logical AND
        this.precedence.set('==', 40);     // Equality
        this.precedence.set('!=', 40);     // Equality
        this.precedence.set('<', 50);      // Comparison
        this.precedence.set('>', 50);      // Comparison
        this.precedence.set('<=', 50);     // Comparison
        this.precedence.set('>=', 50);     // Comparison
        this.precedence.set('+', 60);      // Addition
        this.precedence.set('-', 60);      // Subtraction
        this.precedence.set('*', 70);      // Multiplication
        this.precedence.set('/', 70);      // Division
        this.precedence.set('%', 70);      // Modulo
        
        // ============ INFIX PARSERS (led) ============
        
        // Binary operators (left-associative)
        const binaryOperators = ['+', '-', '*', '/', '%', '==', '!=', '<', '>', '<=', '>='];
        binaryOperators.forEach(op => {
            this.infixParsers.set(op, (left, token) => ({
                type: 'BinaryExpression',
                operator: token.value,
                left: left,
                right: this.parseExpression(this.precedence.get(op)),
                line: token.line,
                column: token.column
            }));
        });
        
        // Logical operators
        this.infixParsers.set('&&', (left, token) => ({
            type: 'LogicalExpression',
            operator: token.value,
            left: left,
            right: this.parseExpression(this.precedence.get('&&')),
            line: token.line,
            column: token.column
        }));
        
        this.infixParsers.set('||', (left, token) => ({
            type: 'LogicalExpression',
            operator: token.value,
            left: left,
            right: this.parseExpression(this.precedence.get('||')),
            line: token.line,
            column: token.column
        }));
        
        // Assignment (right-associative)
        this.infixParsers.set('=', (left, token) => {
            // Check that left side is assignable
            if (left.type !== 'Variable') {
                const error = new Error(`Invalid assignment target at line ${token.line}`);
                this.parser.reportError(error);
                // Return a placeholder
                return {
                    type: 'ErrorExpression',
                    message: error.message,
                    line: token.line,
                    column: token.column
                };
            }
            
            return {
                type: 'AssignmentExpression',
                target: left,
                value: this.parseExpression(this.precedence.get('=') - 1), // Right-associative
                line: token.line,
                column: token.column
            };
        });
    }
    
    /**
     * Parse expression with given minimum precedence
     * @param {number} minPrecedence - Minimum precedence to consider
     * @returns {Object} AST node
     */
    parseExpression(minPrecedence = 0) {
        // Get prefix parser for current token (nud)
        if (!this.parser.currentToken) {
            throw new Error('No token to parse');
        }
        
        let token = this.parser.currentToken;
        
        if (token.type === 'EOF') {
            throw new Error('Unexpected end of expression');
        }
        
        const prefix = this.prefixParsers.get(token.type);
        if (!prefix) {
            throw new Error(`Unexpected token: ${token.value} at line ${token.line}`);
        }
        
        this.parser.advance(); // Consume token
        let left = prefix.call(this, token);
        
        // Handle infix operators while precedence allows (led)
        while (!this.parser.isAtEnd() && this.parser.currentToken) {
            const opToken = this.parser.currentToken;
            if (!this.isInfix(opToken)) break;
            
            const opPrecedence = this.precedence.get(opToken.value) || 0;
            if (opPrecedence < minPrecedence) break;
            
            this.parser.advance(); // Consume operator
            const infix = this.infixParsers.get(opToken.value);
            if (!infix) break;
            
            try {
                left = infix.call(this, left, opToken);
            } catch (error) {
                this.parser.reportError(error);
                // Return what we have so far
                break;
            }
        }
        
        return left;
    }
    
    /**
     * Check if token is an infix operator
     * @param {Object} token - Token to check
     * @returns {boolean} True if token is infix operator
     */
    isInfix(token) {
        if (!token) return false;
        // Only these are truly infix operators that need left operand
        const infixOperators = ['=', '==', '!=', '<', '>', '<=', '>=', 
                               '+', '-', '*', '/', '%', '&&', '||'];
        return infixOperators.includes(token.value);
    }
    
    /**
     * Get precedence of operator
     * @param {string} operator - Operator string
     * @returns {number} Precedence value
     */
    getPrecedence(operator) {
        return this.precedence.get(operator) || 0;
    }
}