// real-time-compiler.js
class RealTimeCompiler {
    constructor(keywords = null) {
        this.lexer = new ManualLexer(keywords || (typeof CONFIG !== 'undefined' ? CONFIG.CUSTOM_KEYWORDS : null));
    }

    compile(code) {
        try {
            console.log("🔍 Phase 1: Manual Lexing");
            const tokens = this.lexer.tokenize(code);
            console.log("✅ Lexing Complete - Tokens:", tokens);
            console.log("Token details:", tokens.map((t, i) => `${i}: ${t.type}="${t.value}"`).join(', '));
            
            console.log("🔍 Phase 2: Manual Parsing");
            const parser = new ManualParser(tokens);
            const ast = parser.parse();
            console.log("✅ Parsing Complete - AST:", ast);
            console.log("AST body length:", ast.body?.length ?? 0);
            
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
                formattedTokens: this.formatTokens(tokens),
                formattedAST: this.formatAST(ast),
                astTree: astTree
            };
        } catch (error) {
            console.error("❌ Compilation Error:", error.message);
            console.error("Stack:", error.stack);
            return {
                success: false,
                error: error.message,
                tokens: [],
                ast: null
            };
        }
    }
    // In real-time-compiler.js
interpret(ast) {
    const output = [];
    const env = {};
    
    const evaluate = (node) => {
        if (!node) return null;
        
        switch (node.type) {
            case 'Program':
                node.body.forEach(stmt => evaluate(stmt));
                return null;
                
            case 'Block':
                node.statements.forEach(stmt => evaluate(stmt));
                return null;
                
            case 'VariableDeclaration':
                env[node.name] = node.initializer ? this.evaluateExpression(node.initializer, env) : 0;
                return null;
                
            case 'PrintStatement':
                const value = node.value ? this.evaluateExpression(node.value, env) : '';
                output.push(String(value));
                return null;
                
            case 'IfStatement':
                if (this.evaluateExpression(node.condition, env)) {
                    evaluate(node.then);
                } else if (node.else) {
                    evaluate(node.else);
                }
                return null;
                
            case 'WhileStatement':
                while (this.evaluateExpression(node.condition, env)) {
                    evaluate(node.body);
                }
                return null;
                
            case 'Assignment':
                env[node.name] = this.evaluateExpression(node.value, env);
                return null;
                
            case 'ExpressionStatement':
                return this.evaluateExpression(node.expression, env);
        }
    };
    
    evaluate(ast);
    return output.join('\n');
}

evaluateExpression(expr, env) {
    if (!expr) return 0;
    
    switch (expr.type) {
        case 'Literal':
            return expr.value;
        case 'Variable':
            return env[expr.name] !== undefined ? env[expr.name] : 0;
        case 'BinaryExpression':
            const left = this.evaluateExpression(expr.left, env);
            const right = this.evaluateExpression(expr.right, env);
            switch (expr.operator) {
                case '+': return left + right;
                case '-': return left - right;
                case '*': return left * right;
                case '/': return right !== 0 ? left / right : 0;
                case '<': return left < right;
                case '>': return left > right;
                case '<=': return left <= right;
                case '>=': return left >= right;
                case '==': return left === right;
                case '!=': return left !== right;
                default: return 0;
            }
        case 'UnaryExpression':
            const arg = this.evaluateExpression(expr.argument, env);
            return expr.operator === '-' ? -arg : arg;
        case 'LogicalExpression':
            return expr.operator === '&&' 
                ? this.evaluateExpression(expr.left, env) && this.evaluateExpression(expr.right, env)
                : this.evaluateExpression(expr.left, env) || this.evaluateExpression(expr.right, env);
        default:
            return 0;
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