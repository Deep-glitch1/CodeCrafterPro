// manual-parser.js
class ManualParser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
        this.currentToken = this.tokens[0];
        this.ast = {
            type: 'Program',
            body: [],
            line: 1,
            column: 1
        };
    }

    parse() {
        let iterationCount = 0;
        const maxIterations = 10000; // Safety limit to prevent infinite loops
        
        while (!this.isAtEnd() && iterationCount < maxIterations) {
            const statement = this.parseStatement();
            if (statement) {
                this.ast.body.push(statement);
            }
            iterationCount++;
        }
        
        if (iterationCount >= maxIterations) {
            console.warn('⚠️ Parser iteration limit reached, possible infinite loop detected');
        }
        
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
            if (this.match('IDENTIFIER')) {
                return this.parseAssignment();
            }
            if (this.match('PUNCTUATION') && this.peek().value === '{') {
                return this.parseBlock();
            }
            return this.parseExpressionStatement();
        } catch (error) {
            this.synchronize();
            return null;
        }
    }

    parseVariableDeclaration() {
        this.consume('VAR_DECLARE', 'Expected variable declaration keyword');
        const name = this.consume('IDENTIFIER', 'Expected variable name').value;
        
        let initializer = null;
        if (this.match('OPERATOR') && this.peek().value === '=') {
            this.advance(); // Consume '='
            initializer = this.parseExpression();
        }
        
        if (this.match('PUNCTUATION') && this.peek().value === ';') {
            this.advance();
        }
        
        return {
            type: 'VariableDeclaration',
            name,
            initializer,
            line: this.currentToken.line,
            column: this.currentToken.column
        };
    }

    parsePrintStatement() {
        this.consume('PRINT', 'Expected print keyword');
        const value = this.parseExpression();
        if (this.match('PUNCTUATION') && this.peek().value === ';') {
            this.advance();
        }
        
        return {
            type: 'PrintStatement',
            value,
            line: this.currentToken.line,
            column: this.currentToken.column
        };
    }

    parseIfStatement() {
        this.consume('IF', 'Expected if keyword');
        const hasParens = this.match('PUNCTUATION') && this.peek().value === '(';
        if (hasParens) {
            this.consumePunctuation('(', "Expected '(' after if");
        }
        const condition = this.parseExpression();
        if (hasParens) {
            this.consumePunctuation(')', "Expected ')' after if condition");
        }
        
        const thenBranch = this.parseStatement();
        let elseBranch = null;
        
        if (this.match('ELSE')) {
            this.advance();
            elseBranch = this.parseStatement();
        }
        
        return {
            type: 'IfStatement',
            condition,
            then: thenBranch,
            else: elseBranch,
            line: this.currentToken.line,
            column: this.currentToken.column
        };
    }

    parseWhileStatement() {
        this.consume('WHILE', 'Expected while keyword');
        const hasParens = this.match('PUNCTUATION') && this.peek().value === '(';
        if (hasParens) {
            this.consumePunctuation('(', "Expected '(' after while");
        }
        const condition = this.parseExpression();
        if (hasParens) {
            this.consumePunctuation(')', "Expected ')' after while condition");
        }
        
        const body = this.parseStatement();
        
        return {
            type: 'WhileStatement',
            condition,
            body,
            line: this.currentToken.line,
            column: this.currentToken.column
        };
    }

    parseAssignment() {
        const name = this.consume('IDENTIFIER', 'Expected variable name').value;
        this.consume('OPERATOR', "Expected '=' for assignment");
        
        const value = this.parseExpression();
        if (this.match('PUNCTUATION') && this.peek().value === ';') {
            this.advance();
        }
        
        return {
            type: 'Assignment',
            name,
            value,
            line: this.currentToken.line,
            column: this.currentToken.column
        };
    }

    parseBlock() {
        this.consumePunctuation('{', "Expected '{'");
        const statements = [];
        
        while (!this.check('PUNCTUATION', '}') && !this.isAtEnd()) {
            const stmt = this.parseStatement();
            if (stmt) statements.push(stmt);
        }
        
        this.consumePunctuation('}', "Expected '}'");
        
        return {
            type: 'Block',
            statements,
            line: this.currentToken.line,
            column: this.currentToken.column
        };
    }

    parseExpressionStatement() {
        const expr = this.parseExpression();
        if (this.match('PUNCTUATION') && this.peek().value === ';') {
            this.advance();
        }
        
        return {
            type: 'ExpressionStatement',
            expression: expr,
            line: this.currentToken.line,
            column: this.currentToken.column
        };
    }

    // Expression parsing (operator precedence)
    parseExpression() {
        return this.parseAssignmentExpression();
    }

    parseAssignmentExpression() {
        const expr = this.parseLogicalOr();
        
        if (this.match('OPERATOR') && this.peek().value === '=') {
            this.advance();
            const value = this.parseAssignmentExpression();
            
            if (expr.type === 'Variable') {
                return {
                    type: 'AssignmentExpression',
                    target: expr,
                    value,
                    line: this.currentToken.line,
                    column: this.currentToken.column
                };
            }
            throw new Error('Invalid assignment target');
        }
        
        return expr;
    }

    parseLogicalOr() {
        let expr = this.parseLogicalAnd();
        
        while (this.match('OPERATOR') && this.peek().value === '||') {
            const operator = this.advance();
            const right = this.parseLogicalAnd();
            expr = {
                type: 'LogicalExpression',
                operator: operator.value,
                left: expr,
                right,
                line: this.currentToken.line,
                column: this.currentToken.column
            };
        }
        
        return expr;
    }

    parseLogicalAnd() {
        let expr = this.parseEquality();
        
        while (this.match('OPERATOR') && this.peek().value === '&&') {
            const operator = this.advance();
            const right = this.parseEquality();
            expr = {
                type: 'LogicalExpression',
                operator: operator.value,
                left: expr,
                right,
                line: this.currentToken.line,
                column: this.currentToken.column
            };
        }
        
        return expr;
    }

    parseEquality() {
        let expr = this.parseComparison();
        
        while (this.match('OPERATOR') && ['==', '!='].includes(this.peek().value)) {
            const operator = this.advance();
            const right = this.parseComparison();
            expr = {
                type: 'BinaryExpression',
                operator: operator.value,
                left: expr,
                right,
                line: this.currentToken.line,
                column: this.currentToken.column
            };
        }
        
        return expr;
    }

    parseComparison() {
        let expr = this.parseTerm();
        
        while (this.match('OPERATOR') && ['<', '>', '<=', '>='].includes(this.peek().value)) {
            const operator = this.advance();
            const right = this.parseTerm();
            expr = {
                type: 'BinaryExpression',
                operator: operator.value,
                left: expr,
                right,
                line: this.currentToken.line,
                column: this.currentToken.column
            };
        }
        
        return expr;
    }

    parseTerm() {
        let expr = this.parseFactor();
        
        while (this.match('OPERATOR') && ['+', '-'].includes(this.peek().value)) {
            const operator = this.advance();
            const right = this.parseFactor();
            expr = {
                type: 'BinaryExpression',
                operator: operator.value,
                left: expr,
                right,
                line: this.currentToken.line,
                column: this.currentToken.column
            };
        }
        
        return expr;
    }

    parseFactor() {
        let expr = this.parseUnary();
        
        while (this.match('OPERATOR') && ['*', '/', '%'].includes(this.peek().value)) {
            const operator = this.advance();
            const right = this.parseUnary();
            expr = {
                type: 'BinaryExpression',
                operator: operator.value,
                left: expr,
                right,
                line: this.currentToken.line,
                column: this.currentToken.column
            };
        }
        
        return expr;
    }

    parseUnary() {
        if (this.match('OPERATOR') && ['!', '-'].includes(this.peek().value)) {
            const operator = this.advance();
            const right = this.parseUnary();
            return {
                type: 'UnaryExpression',
                operator: operator.value,
                argument: right,
                line: this.currentToken.line,
                column: this.currentToken.column
            };
        }
        
        return this.parsePrimary();
    }

    parsePrimary() {
        if (this.match('NUMBER')) {
            return {
                type: 'Literal',
                value: this.advance().value,
                line: this.currentToken.line,
                column: this.currentToken.column
            };
        }
        
        if (this.match('STRING')) {
            return {
                type: 'Literal',
                value: this.advance().value,
                line: this.currentToken.line,
                column: this.currentToken.column
            };
        }
        
        if (this.match('TRUE')) {
            this.advance();
            return {
                type: 'Literal',
                value: true,
                line: this.currentToken.line,
                column: this.currentToken.column
            };
        }
        
        if (this.match('FALSE')) {
            this.advance();
            return {
                type: 'Literal',
                value: false,
                line: this.currentToken.line,
                column: this.currentToken.column
            };
        }
        
        if (this.match('IDENTIFIER')) {
            return {
                type: 'Variable',
                name: this.advance().value,
                line: this.currentToken.line,
                column: this.currentToken.column
            };
        }
        
        if (this.match('PUNCTUATION') && this.peek().value === '(') {
            this.advance(); // Consume '('
            const expr = this.parseExpression();
            this.consumePunctuation(')', "Expected ')'");
            return expr;
        }
        
        throw new Error(`Unexpected token: ${this.currentToken.value}`);
    }

    // Parser helper methods
    match(type) {
        if (this.isAtEnd()) return false;
        return this.currentToken.type === type;
    }

    check(type, value = null) {
        if (this.isAtEnd()) return false;
        if (value !== null) {
            return this.currentToken.type === type && this.currentToken.value === value;
        }
        return this.currentToken.type === type;
    }

    advance() {
        if (!this.isAtEnd()) {
            const token = this.currentToken;
            this.pos++;
            this.currentToken = this.tokens[this.pos];
            return token;
        }
        return this.tokens[this.tokens.length - 1]; // EOF
    }

    consume(type, message) {
        if (this.check(type)) {
            return this.advance();
        }
        throw new Error(`${message} at line ${this.currentToken.line}, column ${this.currentToken.column}`);
    }

    consumePunctuation(value, message) {
        if (this.match('PUNCTUATION') && this.peek().value === value) {
            return this.advance();
        }
        throw new Error(`${message} at line ${this.currentToken.line}, column ${this.currentToken.column}`);
    }

    peek() {
        return this.currentToken;
    }

    isAtEnd() {
        return this.currentToken.type === 'EOF';
    }

    synchronize() {
        this.advance();
        
        while (!this.isAtEnd()) {
            if (this.previousToken().type === 'PUNCTUATION' && this.previousToken().value === ';') {
                return;
            }
            
            switch (this.currentToken.type) {
                case 'VAR_DECLARE':
                case 'PRINT':
                case 'IF':
                case 'WHILE':
                case 'ELSE':
                    return;
            }
            
            this.advance();
        }
    }

    previousToken() {
        return this.tokens[this.pos - 1];
    }
}