// c-python-ast-parser.js
/**
 * C/Python AST Parser
 * Parses C and Python tokens into Abstract Syntax Trees
 * Similar to ManualParser but handles C/Python syntax
 */

class CPythonASTParser {
    constructor(tokens, language = 'c') {
        this.tokens = tokens;
        this.pos = 0;
        this.currentToken = this.tokens[0];
        this.language = language.toLowerCase();
        this.ast = {
            type: 'Program',
            body: [],
            line: 1,
            column: 1
        };
    }

    /**
     * Main parse method
     */
    parse() {
        let iterationCount = 0;
        const maxIterations = 10000;
        
        while (!this.isAtEnd() && iterationCount < maxIterations) {
            const statement = this.parseStatement();
            if (statement) {
                this.ast.body.push(statement);
            }
            iterationCount++;
        }
        
        if (iterationCount >= maxIterations) {
            console.warn('⚠️ Parser iteration limit reached');
        }
        
        return this.ast;
    }

    /**
     * Parse a statement
     */
    parseStatement() {
        try {
            // Skip preprocessor directives
            if (this.match('PREPROCESSOR')) {
                const value = this.peek().value;
                this.advance();
                return {
                    type: 'Preprocessor',
                    value: value,
                    line: this.currentToken.line,
                    column: this.currentToken.column
                };
            }

            // Variable declarations (int x = 5; or x = 5 in Python)
            if (this.isVariableDeclaration()) {
                return this.parseVariableDeclaration();
            }

            // Function definitions
            if (this.isFunctionDefinition()) {
                return this.parseFunctionDefinition();
            }

            // Control flow statements
            if (this.match('IF') || this.match('ELSE') || this.match('WHILE') || 
                this.match('FOR') || this.match('RETURN') || this.match('FUNCTION')) {
                const tokenType = this.currentToken.type;
                if (tokenType === 'IF') {
                    return this.parseIfStatement();
                }
                if (tokenType === 'ELSE') {
                    return this.parseElseStatement();
                }
                if (tokenType === 'WHILE') {
                    return this.parseWhileStatement();
                }
                if (tokenType === 'FOR') {
                    return this.parseForStatement();
                }
                if (tokenType === 'RETURN') {
                    return this.parseReturnStatement();
                }
                this.advance();
            }

            // Print statements
            if (this.isPrintStatement()) {
                return this.parsePrintStatement();
            }

            // Blocks
            if (this.match('PUNCTUATION') && this.peek().value === '{') {
                return this.parseBlock();
            }

            // Expression statements
            if (this.match('IDENTIFIER') || this.match('NUMBER') || this.match('STRING')) {
                return this.parseExpressionStatement();
            }

            // Skip unknown tokens
            if (!this.isAtEnd()) {
                this.advance();
            }

            return null;
        } catch (error) {
            this.synchronize();
            return null;
        }
    }

    /**
     * Check if current position is a variable declaration
     */
    isVariableDeclaration() {
        // C: int x = 5; or float y;
        if (this.match('TYPE')) {
            return true;
        }
        // Python: x = 5
        if (this.match('IDENTIFIER') && this.peekAhead(1) && this.peekAhead(1).value === '=') {
            return true;
        }
        return false;
    }

    /**
     * Parse variable declaration
     */
    parseVariableDeclaration() {
        let type = 'auto';
        
        // Check for explicit type (C)
        if (this.match('TYPE')) {
            const typeToken = this.peek();
            type = typeToken.value;
            this.advance();
        }

        // Get variable name
        const nameToken = this.consume('IDENTIFIER', 'Expected variable name');
        const name = nameToken.value;

        let initializer = null;
        let init_line = nameToken.line;
        let init_column = nameToken.column;

        // Check for assignment
        if (this.match('OPERATOR') && this.peek().value === '=') {
            this.advance(); // consume =
            initializer = this.parseExpression();
            if (initializer) {
                init_line = initializer.line;
                init_column = initializer.column;
            }
        }

        // Consume optional semicolon
        if (this.match('PUNCTUATION') && this.peek().value === ';') {
            this.advance();
        }

        return {
            type: 'VariableDeclaration',
            name: name,
            dataType: type,
            initializer: initializer,
            line: nameToken.line,
            column: nameToken.column
        };
    }

    /**
     * Check if current position is a function definition
     */
    isFunctionDefinition() {
        // Look for patterns like: int main() or def foo():
        if (this.language === 'python') {
            return this.match('FUNCTION') && this.peek().value === 'def';
        }
        // For C, check for type followed by identifier and (
        if (this.match('TYPE')) {
            const next = this.peekAhead(1);
            const afterNext = this.peekAhead(2);
            if (next && next.type === 'IDENTIFIER' && afterNext && afterNext.value === '(') {
                return true;
            }
        }
        return false;
    }

    /**
     * Parse function definition
     */
    parseFunctionDefinition() {
        let returnType = 'void';
        let name = '';
        let params = [];

        if (this.language === 'python') {
            this.consume('FUNCTION', 'Expected def');
            const nameToken = this.consume('IDENTIFIER', 'Expected function name');
            name = nameToken.value;
            this.consume('PUNCTUATION', 'Expected (');
            params = this.parseParameterList();
            this.consume('PUNCTUATION', 'Expected )');
            this.consume('PUNCTUATION', 'Expected :');
        } else {
            // C function
            const typeToken = this.consume('TYPE', 'Expected return type');
            returnType = typeToken.value;
            const nameToken = this.consume('IDENTIFIER', 'Expected function name');
            name = nameToken.value;
            this.consume('PUNCTUATION', 'Expected (');
            params = this.parseParameterList();
            this.consume('PUNCTUATION', 'Expected )');
        }

        // Parse body
        let body = null;
        if (this.match('PUNCTUATION') && this.peek().value === '{') {
            body = this.parseBlock();
        }

        return {
            type: 'FunctionDefinition',
            name: name,
            returnType: returnType,
            parameters: params,
            body: body,
            line: this.currentToken.line,
            column: this.currentToken.column
        };
    }

    /**
     * Parse parameter list
     */
    parseParameterList() {
        const params = [];
        while (!this.isAtEnd() && !(this.match('PUNCTUATION') && this.peek().value === ')')) {
            let paramType = 'auto';
            if (this.match('TYPE')) {
                paramType = this.peek().value;
                this.advance();
            }
            if (this.match('IDENTIFIER')) {
                const name = this.peek().value;
                this.advance();
                params.push({ name, type: paramType });
                if (this.match('PUNCTUATION') && this.peek().value === ',') {
                    this.advance();
                }
            } else {
                break;
            }
        }
        return params;
    }

    /**
     * Parse if statement
     */
    parseIfStatement() {
        this.advance(); // consume if/agar
        
        let test = null;
        if (this.language === 'python') {
            test = this.parseExpression();
            this.consume('PUNCTUATION', 'Expected :');
        } else {
            this.consume('PUNCTUATION', 'Expected (');
            test = this.parseExpression();
            this.consume('PUNCTUATION', 'Expected )');
        }

        // Parse body
        let consequent = null;
        if (this.language === 'python') {
            // Python: indented block follows
            consequent = this.parseBlock();
        } else if (this.match('PUNCTUATION') && this.peek().value === '{') {
            consequent = this.parseBlock();
        } else {
            consequent = this.parseStatement();
        }

        let alternate = null;
        if (this.match('ELSE')) {
            this.advance();
            if (this.language === 'c' && this.match('IF')) {
                alternate = this.parseIfStatement();
            } else {
                if (this.language === 'python') {
                    this.consume('PUNCTUATION', 'Expected :');
                }
                alternate = this.parseBlock();
            }
        }

        return {
            type: 'IfStatement',
            test: test,
            consequent: consequent,
            alternate: alternate,
            line: this.currentToken.line,
            column: this.currentToken.column
        };
    }

    /**
     * Parse else statement
     */
    parseElseStatement() {
        this.advance(); // consume else/warna
        if (this.language === 'python') {
            this.consume('PUNCTUATION', 'Expected :');
        }
        let body = null;
        if (this.match('PUNCTUATION') && this.peek().value === '{') {
            body = this.parseBlock();
        }
        return {
            type: 'ElseStatement',
            body: body,
            line: this.currentToken.line,
            column: this.currentToken.column
        };
    }

    /**
     * Parse while loop
     */
    parseWhileStatement() {
        this.advance(); // consume while/jabtak
        
        if (this.language === 'python') {
            const condition = this.parseExpression();
            this.consume('PUNCTUATION', 'Expected :');
            const body = this.parseBlock();
            return {
                type: 'WhileStatement',
                condition: condition,
                body: body,
                line: this.currentToken.line,
                column: this.currentToken.column
            };
        } else {
            this.consume('PUNCTUATION', 'Expected (');
            const condition = this.parseExpression();
            this.consume('PUNCTUATION', 'Expected )');
            const body = this.match('PUNCTUATION') && this.peek().value === '{' 
                ? this.parseBlock() 
                : this.parseStatement();
            return {
                type: 'WhileStatement',
                condition: condition,
                body: body,
                line: this.currentToken.line,
                column: this.currentToken.column
            };
        }
    }

    /**
     * Parse for loop
     */
    parseForStatement() {
        this.advance(); // consume for
        
        if (this.language === 'python') {
            const variable = this.consume('IDENTIFIER', 'Expected variable').value;
            this.consume('KEYWORD', 'Expected in');
            const iterable = this.parseExpression();
            this.consume('PUNCTUATION', 'Expected :');
            const body = this.parseBlock();
            return {
                type: 'ForStatement',
                variable: variable,
                iterable: iterable,
                body: body,
                line: this.currentToken.line,
                column: this.currentToken.column
            };
        } else {
            this.consume('PUNCTUATION', 'Expected (');
            const init = this.parseVariableDeclaration();
            const condition = this.parseExpression();
            this.consume('PUNCTUATION', 'Expected ;');
            const update = this.parseExpression();
            this.consume('PUNCTUATION', 'Expected )');
            const body = this.match('PUNCTUATION') && this.peek().value === '{' 
                ? this.parseBlock() 
                : this.parseStatement();
            return {
                type: 'ForStatement',
                init: init,
                condition: condition,
                update: update,
                body: body,
                line: this.currentToken.line,
                column: this.currentToken.column
            };
        }
    }

    /**
     * Parse return statement
     */
    parseReturnStatement() {
        this.advance(); // consume return
        let value = null;
        if (!(this.match('PUNCTUATION') && this.peek().value === ';')) {
            value = this.parseExpression();
        }
        if (this.match('PUNCTUATION') && this.peek().value === ';') {
            this.advance();
        }
        return {
            type: 'ReturnStatement',
            value: value,
            line: this.currentToken.line,
            column: this.currentToken.column
        };
    }

    /**
     * Check if current position is a print statement
     */
    isPrintStatement() {
        if (this.match('FUNCTION') || this.match('PRINT')) {
            const name = this.peek().value;
            return name === 'printf' || name === 'print' || name === 'likho';
        }
        if (this.match('IDENTIFIER')) {
            const name = this.peek().value;
            return name === 'printf' || name === 'print' || name === 'likho';
        }
        return false;
    }

    /**
     * Parse print statement
     */
    parsePrintStatement() {
        const printToken = this.consume('IDENTIFIER', 'Expected print statement');
        const printName = printToken.value;
        this.consume('PUNCTUATION', 'Expected (');
        
        const args = [];
        while (!this.isAtEnd() && !(this.match('PUNCTUATION') && this.peek().value === ')')) {
            args.push(this.parseExpression());
            if (this.match('PUNCTUATION') && this.peek().value === ',') {
                this.advance();
            } else {
                break;
            }
        }
        
        this.consume('PUNCTUATION', 'Expected )');
        if (this.match('PUNCTUATION') && this.peek().value === ';') {
            this.advance();
        }

        return {
            type: 'PrintStatement',
            function: printName,
            arguments: args,
            line: printToken.line,
            column: printToken.column
        };
    }

    /**
     * Parse block
     */
    parseBlock() {
        const startLine = this.currentToken.line;
        const startColumn = this.currentToken.column;
        
        if (this.match('PUNCTUATION') && this.peek().value === '{') {
            this.advance();
        }

        const statements = [];
        while (!this.isAtEnd() && !(this.match('PUNCTUATION') && this.peek().value === '}')) {
            const stmt = this.parseStatement();
            if (stmt) {
                statements.push(stmt);
            }
        }

        if (this.match('PUNCTUATION') && this.peek().value === '}') {
            this.advance();
        }

        return {
            type: 'BlockStatement',
            body: statements,
            line: startLine,
            column: startColumn
        };
    }

    /**
     * Parse expression
     */
    parseExpression() {
        return this.parseAssignment();
    }

    /**
     * Parse assignment expression
     */
    parseAssignment() {
        let expr = this.parseLogicalOr();

        if (this.match('OPERATOR') && this.peek().value === '=') {
            const op = this.peek().value;
            this.advance();
            const right = this.parseAssignment();
            return {
                type: 'AssignmentExpression',
                operator: op,
                left: expr,
                right: right,
                line: expr.line,
                column: expr.column
            };
        }

        return expr;
    }

    /**
     * Parse logical OR
     */
    parseLogicalOr() {
        let expr = this.parseLogicalAnd();

        while (this.match('OPERATOR') && (this.peek().value === '||' || this.peek().value === 'or')) {
            const op = this.peek().value;
            this.advance();
            const right = this.parseLogicalAnd();
            expr = {
                type: 'BinaryExpression',
                operator: op,
                left: expr,
                right: right,
                line: expr.line,
                column: expr.column
            };
        }

        return expr;
    }

    /**
     * Parse logical AND
     */
    parseLogicalAnd() {
        let expr = this.parseEquality();

        while (this.match('OPERATOR') && (this.peek().value === '&&' || this.peek().value === 'and')) {
            const op = this.peek().value;
            this.advance();
            const right = this.parseEquality();
            expr = {
                type: 'BinaryExpression',
                operator: op,
                left: expr,
                right: right,
                line: expr.line,
                column: expr.column
            };
        }

        return expr;
    }

    /**
     * Parse equality operators
     */
    parseEquality() {
        let expr = this.parseComparison();

        while (this.match('OPERATOR') && (this.peek().value === '==' || this.peek().value === '!=')) {
            const op = this.peek().value;
            this.advance();
            const right = this.parseComparison();
            expr = {
                type: 'BinaryExpression',
                operator: op,
                left: expr,
                right: right,
                line: expr.line,
                column: expr.column
            };
        }

        return expr;
    }

    /**
     * Parse comparison operators
     */
    parseComparison() {
        let expr = this.parseAdditive();

        while (this.match('OPERATOR') && ['<', '>', '<=', '>='].includes(this.peek().value)) {
            const op = this.peek().value;
            this.advance();
            const right = this.parseAdditive();
            expr = {
                type: 'BinaryExpression',
                operator: op,
                left: expr,
                right: right,
                line: expr.line,
                column: expr.column
            };
        }

        return expr;
    }

    /**
     * Parse addition and subtraction
     */
    parseAdditive() {
        let expr = this.parseMultiplicative();

        while (this.match('OPERATOR') && (this.peek().value === '+' || this.peek().value === '-')) {
            const op = this.peek().value;
            this.advance();
            const right = this.parseMultiplicative();
            expr = {
                type: 'BinaryExpression',
                operator: op,
                left: expr,
                right: right,
                line: expr.line,
                column: expr.column
            };
        }

        return expr;
    }

    /**
     * Parse multiplication and division
     */
    parseMultiplicative() {
        let expr = this.parseUnary();

        while (this.match('OPERATOR') && (this.peek().value === '*' || this.peek().value === '/' || this.peek().value === '%')) {
            const op = this.peek().value;
            this.advance();
            const right = this.parseUnary();
            expr = {
                type: 'BinaryExpression',
                operator: op,
                left: expr,
                right: right,
                line: expr.line,
                column: expr.column
            };
        }

        return expr;
    }

    /**
     * Parse unary operators
     */
    parseUnary() {
        if (this.match('OPERATOR') && (this.peek().value === '-' || this.peek().value === '+' || this.peek().value === '!')) {
            const op = this.peek().value;
            const line = this.currentToken.line;
            const column = this.currentToken.column;
            this.advance();
            const expr = this.parseUnary();
            return {
                type: 'UnaryExpression',
                operator: op,
                argument: expr,
                line: line,
                column: column
            };
        }

        return this.parsePostfix();
    }

    /**
     * Parse postfix operators (function calls, array access)
     */
    parsePostfix() {
        let expr = this.parsePrimary();

        while (!this.isAtEnd()) {
            if (this.match('PUNCTUATION') && this.peek().value === '(') {
                // Function call
                this.advance();
                const args = [];
                while (!this.isAtEnd() && !(this.match('PUNCTUATION') && this.peek().value === ')')) {
                    args.push(this.parseExpression());
                    if (this.match('PUNCTUATION') && this.peek().value === ',') {
                        this.advance();
                    }
                }
                this.consume('PUNCTUATION', 'Expected )');
                expr = {
                    type: 'CallExpression',
                    callee: expr,
                    arguments: args,
                    line: expr.line,
                    column: expr.column
                };
            } else if (this.match('PUNCTUATION') && this.peek().value === '[') {
                // Array access
                this.advance();
                const index = this.parseExpression();
                this.consume('PUNCTUATION', 'Expected ]');
                expr = {
                    type: 'MemberExpression',
                    object: expr,
                    property: index,
                    computed: true,
                    line: expr.line,
                    column: expr.column
                };
            } else {
                break;
            }
        }

        return expr;
    }

    /**
     * Parse primary expressions
     */
    parsePrimary() {
        if (this.match('NUMBER')) {
            const token = this.peek();
            this.advance();
            return {
                type: 'Literal',
                value: token.value,
                raw: token.value,
                line: token.line,
                column: token.column
            };
        }

        if (this.match('STRING')) {
            const token = this.peek();
            this.advance();
            return {
                type: 'Literal',
                value: token.value,
                raw: token.value,
                line: token.line,
                column: token.column
            };
        }

        if (this.match('IDENTIFIER')) {
            const token = this.peek();
            this.advance();
            return {
                type: 'Identifier',
                name: token.value,
                line: token.line,
                column: token.column
            };
        }

        if (this.match('PUNCTUATION') && this.peek().value === '(') {
            this.advance();
            const expr = this.parseExpression();
            this.consume('PUNCTUATION', 'Expected )');
            return expr;
        }

        // Return empty expression if no primary found
        return {
            type: 'Literal',
            value: '',
            raw: '',
            line: this.currentToken?.line || 1,
            column: this.currentToken?.column || 1
        };
    }

    /**
     * Parse expression statement
     */
    parseExpressionStatement() {
        const expr = this.parseExpression();
        if (this.match('PUNCTUATION') && this.peek().value === ';') {
            this.advance();
        }
        return {
            type: 'ExpressionStatement',
            expression: expr,
            line: expr.line,
            column: expr.column
        };
    }

    // Helper methods

    match(type) {
        if (this.isAtEnd()) return false;
        return this.currentToken.type === type;
    }

    peek() {
        if (this.isAtEnd()) return null;
        return this.currentToken;
    }

    peekAhead(n) {
        if (this.pos + n >= this.tokens.length) return null;
        return this.tokens[this.pos + n];
    }

    advance() {
        if (!this.isAtEnd()) {
            this.pos++;
            this.currentToken = this.tokens[this.pos];
        }
        return this.tokens[this.pos - 1];
    }

    consume(type, message) {
        if (this.currentToken?.type === type) {
            return this.advance();
        }
        throw new Error(`${message} at line ${this.currentToken?.line}, column ${this.currentToken?.column}`);
    }

    isAtEnd() {
        return this.pos >= this.tokens.length || this.currentToken === undefined;
    }

    synchronize() {
        this.advance();
        while (!this.isAtEnd()) {
            if (this.tokens[this.pos - 1].type === 'PUNCTUATION' && this.tokens[this.pos - 1].value === ';') {
                return;
            }
            this.advance();
        }
    }
}

// Export for use in browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CPythonASTParser;
}
