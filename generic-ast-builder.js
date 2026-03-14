// generic-ast-builder.js
/**
 * Generic AST Builder - Creates basic AST from tokens for any language
 * Works with tokens from C, Python, or Custom Language
 */
class GenericASTBuilder {
    constructor() {
        this.tokens = [];
        this.pos = 0;
        this.currentToken = null;
        this.maxIterations = 10000;
        this.iterations = 0;
    }

    /**
     * Build AST from tokens
     */
    build(tokens) {
        this.tokens = tokens || [];
        this.pos = 0;
        this.currentToken = this.tokens[0] || null;
        this.iterations = 0;

        console.log('🔨 GenericASTBuilder starting with', this.tokens.length, 'tokens');

        const ast = {
            type: 'Program',
            body: [],
            startLine: 1
        };

        while (!this.isAtEnd() && this.iterations < this.maxIterations) {
            const stmt = this.parseStatement();
            if (stmt) {
                ast.body.push(stmt);
            } else {
                // Skip token if statement parsing failed
                if (this.pos < this.tokens.length) {
                    console.warn('⚠️ Skipping token:', this.tokens[this.pos]);
                    this.advance();
                }
            }
            this.iterations++;
        }

        if (this.iterations >= this.maxIterations) {
            console.error('❌ AST Builder hit max iterations limit!');
        }

        console.log('✅ GenericASTBuilder complete:', ast.body.length, 'statements parsed');
        return ast;
    }

    /**
     * Parse a statement
     */
    parseStatement() {
        if (this.isAtEnd()) return null;

        const token = this.currentToken;
        if (!token) return null;

        // Handle different statement types
        if (this.matchType('PREPROCESSOR')) {
            return this.parsePreprocessor();
        }

        if (this.matchType('TYPE')) {
            return this.parseTypeDeclaration();
        }

        if (this.matchKeyword('def')) {
            return this.parseFunctionDef();
        }

        if (this.matchKeyword('class')) {
            return this.parseClassDef();
        }

        if (this.matchKeyword('import')) {
            return this.parseImport();
        }

        if (this.matchKeyword('if') || this.matchKeyword('agar')) {
            return this.parseIfStatement();
        }

        if (this.matchKeyword('while') || this.matchKeyword('jabtak')) {
            return this.parseWhileStatement();
        }

        if (this.matchKeyword('for')) {
            return this.parseForStatement();
        }

        if (this.matchKeyword('return') || this.matchKeyword('wapas')) {
            return this.parseReturnStatement();
        }

        if (this.matchKeyword('function')) {
            return this.parseFunctionDef();
        }

        // Try to parse as expression/assignment
        return this.parseExpressionStatement();
    }

    /**
     * Parse preprocessor directive
     */
    parsePreprocessor() {
        const token = this.current();
        this.advance();
        return {
            type: 'PreprocessorDirective',
            directive: token.value,
            line: token.line
        };
    }

    /**
     * Parse type declaration (int, float, var, etc.)
     */
    parseTypeDeclaration() {
        const typeToken = this.current();
        this.advance();

        const identifierToken = this.current();
        if (this.matchType('IDENTIFIER')) {
            const funcName = identifierToken.value;
            this.advance();
            
            // Check if this is a function definition (identifier followed by parenthesis)
            if (this.matchType('PUNCTUATION') && this.current().value === '(') {
                // This is a function definition!
                return this.parseFunctionDefWithoutKeyword(typeToken, funcName);
            }
            
            // Otherwise, it's a variable declaration
            let initializer = null;

            // Check for assignment
            if (this.matchType('OPERATOR') && this.current().value === '=') {
                this.advance();
                initializer = this.parseExpression();
            }

            // Skip semicolon if present
            if (this.matchType('PUNCTUATION') && this.current().value === ';') {
                this.advance();
            }

            return {
                type: 'VariableDeclaration',
                name: identifierToken.value,
                dataType: typeToken.value,
                initializer: initializer,
                line: typeToken.line
            };
        }

        return null;
    }

    /**
     * Parse function definition that starts with type (e.g., int main() {...})
     */
    parseFunctionDefWithoutKeyword(typeToken, funcName) {
        const params = [];
        if (this.matchType('PUNCTUATION') && this.current().value === '(') {
            this.advance();
            while (!this.isAtEnd() && !(this.matchType('PUNCTUATION') && this.current().value === ')')) {
                if (this.matchType('IDENTIFIER')) {
                    params.push(this.current().value);
                    this.advance();
                }
                if (this.matchType('PUNCTUATION') && this.current().value === ',') {
                    this.advance();
                }
            }
            if (this.matchType('PUNCTUATION') && this.current().value === ')') {
                this.advance();
            }
        }

        const body = [];
        if (this.matchType('PUNCTUATION') && this.current().value === '{') {
            this.advance();
            while (!this.isAtEnd() && !(this.matchType('PUNCTUATION') && this.current().value === '}')) {
                const stmt = this.parseStatement();
                if (stmt) body.push(stmt);
            }
            if (this.matchType('PUNCTUATION') && this.current().value === '}') {
                this.advance();
            }
        }

        return {
            type: 'FunctionDefinition',
            name: funcName,
            returnType: typeToken.value,
            parameters: params,
            body: body,
            line: typeToken.line
        };
    }

    /**
     * Parse function definition
     */
    parseFunctionDef() {
        const keyword = this.current();
        this.advance();

        let funcName = 'anonymous';
        if (this.matchType('IDENTIFIER')) {
            funcName = this.current().value;
            this.advance();
        }

        const params = [];
        if (this.matchType('PUNCTUATION') && this.current().value === '(') {
            this.advance();
            while (!this.isAtEnd() && !(this.matchType('PUNCTUATION') && this.current().value === ')')) {
                if (this.matchType('IDENTIFIER')) {
                    params.push(this.current().value);
                    this.advance();
                }
                if (this.matchType('PUNCTUATION') && this.current().value === ',') {
                    this.advance();
                }
            }
            if (this.matchType('PUNCTUATION') && this.current().value === ')') {
                this.advance();
            }
        }

        const body = [];
        if (this.matchType('PUNCTUATION') && this.current().value === ':') {
            this.advance();
            // Parse indented block for Python
        } else if (this.matchType('PUNCTUATION') && this.current().value === '{') {
            this.advance();
            while (!this.isAtEnd() && !(this.matchType('PUNCTUATION') && this.current().value === '}')) {
                const stmt = this.parseStatement();
                if (stmt) body.push(stmt);
            }
            if (this.matchType('PUNCTUATION') && this.current().value === '}') {
                this.advance();
            }
        }

        return {
            type: 'FunctionDefinition',
            name: funcName,
            parameters: params,
            body: body,
            line: keyword.line
        };
    }

    /**
     * Parse class definition
     */
    parseClassDef() {
        const keyword = this.current();
        this.advance();

        let className = 'UnnamedClass';
        if (this.matchType('IDENTIFIER')) {
            className = this.current().value;
            this.advance();
        }

        return {
            type: 'ClassDefinition',
            name: className,
            line: keyword.line
        };
    }

    /**
     * Parse import statement
     */
    parseImport() {
        const keyword = this.current();
        this.advance();

        const modules = [];
        while (!this.isAtEnd() && !this.matchType('PUNCTUATION') && this.current().value !== ';') {
            if (this.matchType('IDENTIFIER')) {
                modules.push(this.current().value);
            }
            this.advance();
        }

        if (this.matchType('PUNCTUATION') && this.current().value === ';') {
            this.advance();
        }

        return {
            type: 'ImportStatement',
            modules: modules,
            line: keyword.line
        };
    }

    /**
     * Parse if statement
     */
    parseIfStatement() {
        const keyword = this.current();
        this.advance();

        const condition = this.parseCondition();

        const thenBody = [];
        const elseBody = [];

        // Parse then body
        if (this.matchType('PUNCTUATION') && this.current().value === '{') {
            this.advance();
            while (!this.isAtEnd() && !(this.matchType('PUNCTUATION') && this.current().value === '}')) {
                const stmt = this.parseStatement();
                if (stmt) thenBody.push(stmt);
            }
            if (this.matchType('PUNCTUATION') && this.current().value === '}') {
                this.advance();
            }
        } else if (this.matchType('PUNCTUATION') && this.current().value === ':') {
            this.advance();
            // Python indented block
        }

        // Check for else
        if (this.matchKeyword('else') || this.matchKeyword('warna')) {
            this.advance();
            if (this.matchType('PUNCTUATION') && this.current().value === '{') {
                this.advance();
                while (!this.isAtEnd() && !(this.matchType('PUNCTUATION') && this.current().value === '}')) {
                    const stmt = this.parseStatement();
                    if (stmt) elseBody.push(stmt);
                }
                if (this.matchType('PUNCTUATION') && this.current().value === '}') {
                    this.advance();
                }
            }
        }

        return {
            type: 'IfStatement',
            condition: condition,
            thenBody: thenBody,
            elseBody: elseBody,
            line: keyword.line
        };
    }

    /**
     * Parse while loop
     */
    parseWhileStatement() {
        const keyword = this.current();
        this.advance();

        const condition = this.parseCondition();

        const body = [];
        if (this.matchType('PUNCTUATION') && this.current().value === '{') {
            this.advance();
            while (!this.isAtEnd() && !(this.matchType('PUNCTUATION') && this.current().value === '}')) {
                const stmt = this.parseStatement();
                if (stmt) body.push(stmt);
            }
            if (this.matchType('PUNCTUATION') && this.current().value === '}') {
                this.advance();
            }
        }

        return {
            type: 'WhileStatement',
            condition: condition,
            body: body,
            line: keyword.line
        };
    }

    /**
     * Parse for loop
     */
    parseForStatement() {
        const keyword = this.current();
        this.advance();

        let initializer = null;
        let condition = null;
        let update = null;

        if (this.matchType('PUNCTUATION') && this.current().value === '(') {
            this.advance();

            // Parse initializer (int i = 1 or i = 0)
            if (!this.matchType('PUNCTUATION') || this.current().value !== ';') {
                initializer = this.parseExpression();
            }
            if (this.matchType('PUNCTUATION') && this.current().value === ';') {
                this.advance();
            }

            // Parse condition (i <= x)
            if (!this.matchType('PUNCTUATION') || this.current().value !== ';') {
                condition = this.parseExpression();
            }
            if (this.matchType('PUNCTUATION') && this.current().value === ';') {
                this.advance();
            }

            // Parse update (i++)
            if (!this.matchType('PUNCTUATION') || this.current().value !== ')') {
                update = this.parseExpression();
            }
            if (this.matchType('PUNCTUATION') && this.current().value === ')') {
                this.advance();
            }
        }

        const body = [];
        if (this.matchType('PUNCTUATION') && this.current().value === '{') {
            this.advance();
            while (!this.isAtEnd() && !(this.matchType('PUNCTUATION') && this.current().value === '}')) {
                const stmt = this.parseStatement();
                if (stmt) body.push(stmt);
            }
            if (this.matchType('PUNCTUATION') && this.current().value === '}') {
                this.advance();
            }
        }

        return {
            type: 'ForStatement',
            initializer: initializer,
            condition: condition,
            update: update,
            body: body,
            line: keyword.line
        };
    }

    /**
     * Parse return statement
     */
    parseReturnStatement() {
        const keyword = this.current();
        this.advance();

        let argument = null;

        // Check if there's a value to return (not a semicolon or closing brace)
        if (!this.isAtEnd() && !(this.matchType('PUNCTUATION') && (this.current().value === ';' || this.current().value === '}'))) {
            argument = this.parseExpression();
        }

        // Skip semicolon if present
        if (this.matchType('PUNCTUATION') && this.current().value === ';') {
            this.advance();
        }

        return {
            type: 'ReturnStatement',
            argument: argument,
            line: keyword.line
        };
    }

    /**
     * Parse condition in parentheses
     */
    parseCondition() {
        if (this.matchType('PUNCTUATION') && this.current().value === '(') {
            this.advance();
        }

        const expr = this.parseExpression();

        if (this.matchType('PUNCTUATION') && this.current().value === ')') {
            this.advance();
        }

        return expr;
    }

    /**
     * Parse expression statement
     */
    parseExpressionStatement() {
        const expr = this.parseExpression();

        // Skip semicolon
        if (this.matchType('PUNCTUATION') && this.current().value === ';') {
            this.advance();
        }

        if (expr) {
            return {
                type: 'ExpressionStatement',
                expression: expr
            };
        }

        return null;
    }

    /**
     * Parse expression (simple version)
     */
    parseExpression() {
        return this.parseBinaryExpression();
    }

    /**
     * Parse binary expression
     */
    parseBinaryExpression() {
        let left = this.parsePrimary();
        let loopCount = 0;

        while (!this.isAtEnd() && this.matchType('OPERATOR') && loopCount < 100) {
            const op = this.current().value;
            const prevPos = this.pos;
            this.advance();
            
            const right = this.parsePrimary();
            if (!right && this.pos === prevPos) {
                // No progress, break to avoid infinite loop
                console.warn('⚠️ Binary expression parser not making progress');
                break;
            }
            
            left = {
                type: 'BinaryExpression',
                operator: op,
                left: left,
                right: right
            };
            loopCount++;
        }

        return left;
    }

    /**
     * Parse primary expression
     */
    parsePrimary() {
        const token = this.current();

        if (!token) return null;

        const startPos = this.pos;

        // Literal (number, string)
        if (this.matchType('NUMBER')) {
            this.advance();
            return {
                type: 'NumberLiteral',
                value: token.value,
                line: token.line
            };
        }

        if (this.matchType('STRING')) {
            this.advance();
            return {
                type: 'StringLiteral',
                value: token.value,
                line: token.line
            };
        }

        // Identifier or function call
        if (this.matchType('IDENTIFIER') || this.matchType('PRINT') || this.matchType('FUNCTION')) {
            const name = token.value;
            this.advance();

            // Check for function call
            if (this.matchType('PUNCTUATION') && this.current().value === '(') {
                this.advance();
                const args = [];
                let argCount = 0;
                while (!this.isAtEnd() && !(this.matchType('PUNCTUATION') && this.current().value === ')') && argCount < 20) {
                    const arg = this.parseExpression();
                    if (arg) args.push(arg);
                    if (this.matchType('PUNCTUATION') && this.current().value === ',') {
                        this.advance();
                    }
                    argCount++;
                }
                if (this.matchType('PUNCTUATION') && this.current().value === ')') {
                    this.advance();
                }

                return {
                    type: 'FunctionCall',
                    name: name,
                    arguments: args,
                    line: token.line
                };
            }

            // Variable reference
            return {
                type: 'Identifier',
                name: name,
                line: token.line
            };
        }

        // Handle custom keywords
        if (this.matchKeyword('maano')) {
            this.advance();
            if (this.matchType('IDENTIFIER')) {
                const varName = this.current().value;
                this.advance();
                return {
                    type: 'VariableDeclaration',
                    name: varName,
                    line: token.line
                };
            }
        }

        if (this.matchKeyword('likho')) {
            this.advance();
            const value = this.parsePrimary();
            return {
                type: 'PrintStatement',
                value: value,
                line: token.line
            };
        }

        // If we couldn't parse anything, skip this token
        if (this.pos === startPos) {
            console.warn('⚠️ Skipping unrecognized token:', token.type, token.value);
            this.advance();
        }
        
        return null;
    }

    // Helper methods
    current() {
        return this.tokens[this.pos] || null;
    }

    advance() {
        if (!this.isAtEnd()) {
            this.pos++;
            this.currentToken = this.tokens[this.pos] || null;
        }
    }

    isAtEnd() {
        return !this.currentToken || this.currentToken.type === 'EOF';
    }

    matchType(type) {
        const current = this.current();
        return current && current.type === type;
    }

    matchKeyword(keyword) {
        const current = this.current();
        return current && (current.value === keyword || current.type === keyword.toUpperCase());
    }

    /**
     * Format AST as a hierarchical tree view
     */
    formatAsTree(node, indent = '', isLast = true, parentType = null) {
        if (!node) return '';

        let result = '';
        const prefix = isLast ? '└── ' : '├── ';
        const connector = isLast ? '    ' : '│   ';

        // Start with Program node
        if (!indent && node.type === 'Program') {
            result += 'Program\n';
            if (node.body && node.body.length > 0) {
                node.body.forEach((child, index) => {
                    const isLastChild = index === node.body.length - 1;
                    result += this.formatAsTree(child, '', isLastChild);
                });
            }
            return result;
        }

        // For non-Program nodes
        let nodeLabel = '';
        let children = [];

        switch (node.type) {
            case 'Preprocessor':
            case 'PreprocessorDirective':
                nodeLabel = `Include: ${node.value || node.directive || '#include ...'}`;
                break;

            case 'VariableDeclaration':
                nodeLabel = `Expression: ${node.dataType || 'auto'} ${node.name}`;
                if (node.initializer) {
                    nodeLabel += ' = ' + this.formatExpressionShort(node.initializer);
                }
                nodeLabel += ';';
                break;

            case 'PrintStatement':
                const func = node.function || 'print';
                nodeLabel = `Statement: ${func}(${node.arguments ? node.arguments.length : 0});`;
                break;

            case 'FunctionCall':
                nodeLabel = `Statement: ${node.name}(${node.arguments ? node.arguments.length : 0});`;
                break;

            case 'Assignment':
            case 'AssignmentExpression':
                if (node.target?.name) {
                    nodeLabel = `Expression: ${node.target.name} ${node.operator || '='} ...;`;
                } else if (node.left?.name) {
                    nodeLabel = `Expression: ${node.left.name} ${node.operator || '='} ...;`;
                } else {
                    nodeLabel = `Assignment`;
                }
                break;

            case 'ExpressionStatement':
                if (node.expression) {
                    const exprStr = this.formatExpressionShort(node.expression);
                    nodeLabel = `Expression: ${exprStr};`;
                } else {
                    nodeLabel = `Expression: ...;`;
                }
                break;

            case 'IfStatement':
                nodeLabel = `Expression: if(...) {`;
                if (node.consequent) {
                    children.push({ node: node.consequent, label: null, isIf: true });
                }
                if (node.elseBody && node.elseBody.length > 0) {
                    children.push({ label: '} else {', isElse: true, body: node.elseBody });
                } else if (node.alternate) {
                    children.push({ node: node.alternate, label: null, isElse: true });
                }
                break;

            case 'WhileStatement':
            case 'jabtak': 
                nodeLabel = `Expression: while(...) {`;
                if (node.body) {
                    children.push({ node: node.body, isBlock: true });
                }
                break;

            case 'ForStatement':
                nodeLabel = `Expression: for(...) {`;
                if (node.body && node.body.length > 0) {
                    children = node.body.map(n => ({ node: n }));
                }
                break;

            case 'BlockStatement':
                if (node.body && node.body.length > 0) {
                    children = node.body.map(n => ({ node: n }));
                }
                break;

            case 'ReturnStatement':
                nodeLabel = `Return: return`;
                if (node.value) {
                    nodeLabel += ` ${this.formatExpressionShort(node.value)}`;
                }
                nodeLabel += ';';
                break;

            case 'FunctionDefinition':
                nodeLabel = `FunctionDef: ${node.returnType || 'void'} ${node.name}()`;
                if (node.body) {
                    if (node.body.statements && node.body.statements.length > 0) {
                        children = node.body.statements.map(n => ({ node: n }));
                    } else if (node.body.body && node.body.body.length > 0) {
                        children = node.body.body.map(n => ({ node: n }));
                    }
                }
                break;

            default:
                if (node.name) {
                    nodeLabel = `${node.type}: ${node.name}`;
                } else {
                    nodeLabel = node.type;
                }
        }

        // Format the node
        result += indent + prefix + nodeLabel + '\n';

        // Format children
        if (children.length > 0) {
            children.forEach((child, idx) => {
                const isLastChild = idx === children.length - 1;
                const childConnector = isLastChild ? '    ' : '│   ';
                
                if (child.label) {
                    // Direct label (like } else {)
                    result += indent + connector + (isLastChild ? '└── ' : '├── ') + child.label + '\n';
                    if (child.body && child.body.length > 0) {
                        child.body.forEach((stmt, sidx) => {
                            const isLastStmt = sidx === child.body.length - 1;
                            result += this.formatAsTree(stmt, indent + connector + childConnector, isLastStmt);
                        });
                    }
                } else if (child.node) {
                    // Recursive node formatting
                    result += this.formatAsTree(child.node, indent + connector, isLastChild);
                }
            });

            // Add closing brace
            result += indent + connector + '└── }\n';
        }

        return result;
    }

    /**
     * Format expression for short display
     */
    formatExpressionShort(expr) {
        if (!expr) return '...';

        if (expr.type === 'Literal' || expr.type === 'NumberLiteral') {
            return String(expr.value);
        } else if (expr.type === 'StringLiteral') {
            return `"${expr.value}"`;
        } else if (expr.type === 'Identifier' || expr.type === 'Variable') {
            return expr.name || '...';
        } else if (expr.type === 'BinaryExpression') {
            return `... ${expr.operator} ...`;
        } else if (expr.type === 'FunctionCall' || expr.type === 'CallExpression') {
            return `${expr.name || expr.callee?.name || 'func'}(...)`;
        } else {
            return '...';
        }
    }

    /**
     * Format an expression for display
     */
    formatExpression(expr) {
        if (!expr) return '...';
        
        if (expr.type === 'Literal' || expr.type === 'NumberLiteral') {
            return String(expr.value);
        } else if (expr.type === 'StringLiteral') {
            return `"${expr.value}"`;
        } else if (expr.type === 'Identifier' || expr.type === 'Variable') {
            return expr.name || '...';
        } else if (expr.type === 'BinaryExpression') {
            return `${this.formatExpression(expr.left)} ${expr.operator} ${this.formatExpression(expr.right)}`;
        } else if (expr.type === 'FunctionCall') {
            return `${expr.name}()`;
        } else if (expr.type === 'Variable') {
            return expr.name;
        } else {
            return '...';
        }
    }
}
