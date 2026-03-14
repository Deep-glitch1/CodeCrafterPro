// c-python-ast-formatter.js
/**
 * C/Python AST Formatter
 * Formats AST from C/Python code into a beautiful tree structure
 * Similar to the format shown in the example
 */

class CPythonASTFormatter {
    constructor() {
        this.output = [];
    }

    /**
     * Format an AST into a tree string
     */
    formatAsTree(ast, language = 'c') {
        if (!ast) return 'No AST available';

        this.output = [];
        this.language = language;

        // Start with header
        this.output.push('Abstract Syntax Tree:');
        
        // Format the program
        if (ast.type === 'Program') {
            this.formatProgram(ast, '');
        } else {
            this.formatNode(ast, '', true);
        }

        return this.output.join('\n');
    }

    /**
     * Format Program node
     */
    formatProgram(node, prefix) {
        this.output.push(`${prefix}├── Program`);
        
        if (!node.body || node.body.length === 0) {
            this.output.push(`${prefix}│   └── (empty program)`);
            return;
        }

        node.body.forEach((child, index) => {
            const isLast = index === node.body.length - 1;
            const childPrefix = isLast ? '│   └── ' : '│   ├── ';
            const nextPrefix = isLast ? '│       ' : '│   │   ';
            
            this.formatStatementNode(child, prefix + childPrefix, prefix + nextPrefix, isLast);
        });
    }

    /**
     * Format a statement node
     */
    formatStatementNode(node, prefix, nextPrefix, isLast) {
        if (!node) {
            this.output.push(`${prefix}(null)`);
            return;
        }

        switch (node.type) {
            case 'Preprocessor':
                this.output.push(`${prefix}Include: ${node.value || '#include ...'}`);
                break;

            case 'VariableDeclaration':
                let varDisplay = `Expression: ${node.dataType || 'auto'} ${node.name}`;
                if (node.initializer) {
                    varDisplay += ' = ' + this.formatExpression(node.initializer);
                }
                varDisplay += ';';
                this.output.push(`${prefix}${varDisplay}`);
                break;

            case 'FunctionDefinition':
                const funcDispla = `FunctionDef: ${node.returnType || 'void'} ${node.name}()`;
                this.output.push(`${prefix}${funcDispla}`);
                
                if (node.body && node.body.statements && node.body.statements.length > 0) {
                    node.body.statements.forEach((stmt, idx) => {
                        const isLastStmt = idx === node.body.statements.length - 1;
                        const stmtPrefix = isLastStmt ? '└── ' : '├── ';
                        const stmtNextPrefix = isLastStmt ? '    ' : '│   ';
                        this.formatStatementNode(stmt, nextPrefix + stmtPrefix, nextPrefix + stmtNextPrefix, isLastStmt);
                    });
                }
                break;

            case 'PrintStatement':
                const args = node.arguments ? `(${node.arguments.length})` : '()';
                this.output.push(`${prefix}Statement: ${node.function}${args};`);
                break;

            case 'IfStatement':
                this.output.push(`${prefix}Expression: if(...) {`);
                if (node.consequent) {
                    this.formatStatementNode(node.consequent, nextPrefix + '├── ', nextPrefix + '│   ', false);
                }
                if (node.alternate) {
                    this.output.push(`${nextPrefix}└── } else {`);
                    this.formatStatementNode(node.alternate, nextPrefix + '    ├── ', nextPrefix + '    │   ', true);
                    this.output.push(`${nextPrefix}}`);
                } else {
                    this.output.push(`${nextPrefix}}`);
                }
                break;

            case 'WhileStatement':
                this.output.push(`${prefix}Expression: while(...) {`);
                if (node.body) {
                    this.formatStatementNode(node.body, nextPrefix + '├── ', nextPrefix + '│   ', true);
                }
                this.output.push(`${nextPrefix}}`);
                break;

            case 'ForStatement':
                this.output.push(`${prefix}Expression: for(...) {`);
                if (node.body) {
                    this.formatStatementNode(node.body, nextPrefix + '├── ', nextPrefix + '│   ', true);
                }
                this.output.push(`${nextPrefix}}`);
                break;

            case 'BlockStatement':
                if (node.body && node.body.length > 0) {
                    node.body.forEach((stmt, idx) => {
                        const isLastStmt = idx === node.body.length - 1;
                        const stmtPrefix = isLastStmt ? '└── ' : '├── ';
                        const stmtNextPrefix = isLastStmt ? '    ' : '│   ';
                        this.formatStatementNode(stmt, nextPrefix + stmtPrefix, nextPrefix + stmtNextPrefix, isLastStmt);
                    });
                }
                break;

            case 'ReturnStatement':
                let retDisplay = 'Return: return';
                if (node.value) {
                    retDisplay += ' ' + this.formatExpression(node.value);
                }
                retDisplay += ';';
                this.output.push(`${prefix}${retDisplay}`);
                break;

            case 'ExpressionStatement':
                if (node.expression) {
                    const exprStr = this.formatExpression(node.expression);
                    this.output.push(`${prefix}Expression: ${exprStr};`);
                } else {
                    this.output.push(`${prefix}Expression: ...;`);
                }
                break;

            default:
                this.output.push(`${prefix}${node.type || 'Unknown'}`);
                if (node.name) {
                    this.output[this.output.length - 1] += `: ${node.name}`;
                }
        }
    }

    /**
     * Format an expression for display
     */
    formatExpression(expr) {
        if (!expr) return '...';

        switch (expr.type) {
            case 'Literal':
                if (typeof expr.value === 'string') {
                    return `"${expr.value}"`;
                }
                return String(expr.value);

            case 'Identifier':
            case 'Variable':
                return expr.name || '...';

            case 'BinaryExpression':
                const left = this.formatExpression(expr.left);
                const right = this.formatExpression(expr.right);
                return `${left} ${expr.operator} ${right}`;

            case 'UnaryExpression':
                const arg = this.formatExpression(expr.argument);
                return `${expr.operator}${arg}`;

            case 'CallExpression':
            case 'FunctionCall':
                const funcName = expr.callee?.name || expr.name || 'func';
                const argCount = expr.arguments ? expr.arguments.length : 0;
                return `${funcName}(${argCount} args)`;

            case 'AssignmentExpression':
                const assignLeft = this.formatExpression(expr.left);
                const assignRight = this.formatExpression(expr.right);
                return `${assignLeft} ${expr.operator} ${assignRight}`;

            case 'ArrayExpression':
                return `[...]`;

            case 'ObjectExpression':
                return `{...}`;

            default:
                return expr.value || expr.name || '...';
        }
    }
}

// Export for use in browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CPythonASTFormatter;
}
