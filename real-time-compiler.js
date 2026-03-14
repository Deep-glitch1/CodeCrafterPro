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