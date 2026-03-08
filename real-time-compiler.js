// real-time-compiler.js
class SymbolTable {
    constructor() {
        this.scopes = [new Map()];
        this.currentScope = 0;
    }

    enterScope() {
        this.scopes.push(new Map());
        this.currentScope += 1;
    }

    exitScope() {
        if (this.currentScope === 0) return;
        this.scopes.pop();
        this.currentScope -= 1;
    }

    hasInCurrentScope(name) {
        return this.scopes[this.currentScope].has(name);
    }

    addSymbol(name, value, node) {
        this.scopes[this.currentScope].set(name, {
            name,
            value,
            node,
            scope: this.currentScope
        });
    }

    lookup(name) {
        for (let i = this.currentScope; i >= 0; i -= 1) {
            if (this.scopes[i].has(name)) {
                return this.scopes[i].get(name);
            }
        }
        return null;
    }

    assign(name, value) {
        for (let i = this.currentScope; i >= 0; i -= 1) {
            if (this.scopes[i].has(name)) {
                const entry = this.scopes[i].get(name);
                entry.value = value;
                return true;
            }
        }
        return false;
    }
}

class RealTimeCompiler {
    constructor(keywords = null) {
        this.lexer = new ManualLexer(keywords || (typeof CONFIG !== 'undefined' ? CONFIG.CUSTOM_KEYWORDS : null));
        this.symbolTable = new SymbolTable();
        this.outputBuffer = [];
    }

    compile(code) {
        try {
            console.log("🔍 Phase 1: Manual Lexing");
            const tokens = this.lexer.tokenize(code);
            console.log("✅ Lexing Complete - Tokens:", tokens);
            
            console.log("🔍 Phase 2: Manual Parsing");
            const parser = new ManualParser(tokens);
            const ast = parser.parse();
            console.log("✅ Parsing Complete - AST:", ast);
            
            console.log("🔍 Phase 3: Interpretation");
            const result = this.interpret(ast);
            
            // Format AST as tree for hierarchical display
            let astTree = '';
            try {
                const astBuilder = new GenericASTBuilder();
                astTree = astBuilder.formatAsTree(ast);
            } catch (e) {
                console.warn('⚠️ Could not format AST as tree:', e.message);
                astTree = this.formatAST(ast); // Fallback to old format
            }
            
            return {
                success: true,
                tokens: tokens,
                ast: ast,
                output: result,
                formattedTokens: this.formatTokens(tokens),
                formattedAST: this.formatAST(ast),
                astTree: astTree
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                output: `Compilation Error: ${error.message}`
            };
        }
    }

    interpret(ast) {
        this.symbolTable = new SymbolTable();
        this.outputBuffer = [];

        for (const node of ast.body) {
            this.evaluate(node);
        }

        return this.outputBuffer.join('\n');
    }

    evaluate(node) {
        switch (node.type) {
            case 'VariableDeclaration':
                const value = node.initializer ? this.evaluate(node.initializer) : 0;
                if (this.symbolTable.assign(node.name, value)) {
                    break;
                }
                this.symbolTable.addSymbol(node.name, value, node);
                break;
                
            case 'Assignment':
                const assignValue = this.evaluate(node.value);
                if (!this.symbolTable.assign(node.name, assignValue)) {
                    throw new Error(`Undefined variable: ${node.name}`);
                }
                break;
                
            case 'AssignmentExpression':
                const exprValue = this.evaluate(node.value);
                if (node.target.type === 'Variable') {
                    if (!this.symbolTable.assign(node.target.name, exprValue)) {
                        throw new Error(`Undefined variable: ${node.target.name}`);
                    }
                }
                return exprValue;
                
            case 'PrintStatement':
                const printValue = this.evaluate(node.value);
                console.log(printValue);
                this.outputBuffer.push(printValue);
                return printValue;
                
            case 'IfStatement':
                const condition = this.evaluate(node.condition);
                if (condition) {
                    this.evaluate(node.then);
                } else if (node.else) {
                    this.evaluate(node.else);
                }
                break;
                
            case 'WhileStatement':
                while (this.evaluate(node.condition)) {
                    this.evaluate(node.body);
                }
                break;
                
            case 'Block':
                this.symbolTable.enterScope();
                try {
                    for (const stmt of node.statements) {
                        this.evaluate(stmt);
                    }
                } finally {
                    this.symbolTable.exitScope();
                }
                break;
                
            case 'ExpressionStatement':
                return this.evaluate(node.expression);
                
            case 'BinaryExpression':
                const left = this.evaluate(node.left);
                const right = this.evaluate(node.right);
                switch (node.operator) {
                    case '+': return left + right;
                    case '-': return left - right;
                    case '*': return left * right;
                    case '/': return left / right;
                    case '%': return left % right;
                    case '==': return left == right;
                    case '!=': return left != right;
                    case '<': return left < right;
                    case '>': return left > right;
                    case '<=': return left <= right;
                    case '>=': return left >= right;
                    case '&&': return left && right;
                    case '||': return left || right;
                    default: throw new Error(`Unknown operator: ${node.operator}`);
                }
                
            case 'UnaryExpression':
                const arg = this.evaluate(node.argument);
                switch (node.operator) {
                    case '-': return -arg;
                    case '!': return !arg;
                    default: throw new Error(`Unknown unary operator: ${node.operator}`);
                }
                
            case 'LogicalExpression':
                const leftLogic = this.evaluate(node.left);
                const rightLogic = this.evaluate(node.right);
                switch (node.operator) {
                    case '&&': return leftLogic && rightLogic;
                    case '||': return leftLogic || rightLogic;
                    default: throw new Error(`Unknown logical operator: ${node.operator}`);
                }
                
            case 'Variable':
                const entry = this.symbolTable.lookup(node.name);
                if (!entry) {
                    throw new Error(`Undefined variable: ${node.name}`);
                }
                return entry.value;
                
            case 'Literal':
                return node.value;
                
            default:
                throw new Error(`Unknown node type: ${node.type}`);
        }
    }

    formatTokens(tokens) {
        return tokens.map((token, i) => {
            return `${i + 1}. ${token.type} "${token.value}" (line ${token.line}, col ${token.column})`;
        }).join('\n');
    }

    formatAST(node, depth = 0) {
        const indent = '  '.repeat(depth);
        let result = `${indent}${node.type}`;
        
        if (node.value !== undefined) {
            result += `: ${JSON.stringify(node.value)}`;
        }
        if (node.name) {
            result += ` (name: ${node.name})`;
        }
        if (node.operator) {
            result += ` [operator: ${node.operator}]`;
        }
        
        result += '\n';
        
        // Recursively format child nodes
        const childProperties = ['body', 'statements', 'then', 'else', 'condition', 'initializer', 'value', 'left', 'right', 'argument', 'target'];
        
        for (const prop of childProperties) {
            if (node[prop]) {
                if (Array.isArray(node[prop])) {
                    node[prop].forEach(child => {
                        if (child && typeof child === 'object') {
                            result += this.formatAST(child, depth + 1);
                        }
                    });
                } else if (node[prop] && typeof node[prop] === 'object') {
                    result += this.formatAST(node[prop], depth + 1);
                }
            }
        }
        
        return result;
    }
}