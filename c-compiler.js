// c-compiler.js
// C/C++ Compiler Implementation

class CCompiler {
    constructor() {
        this.available = false;
        this.Module = null;
        this.initializeWASM();
    }

    async initializeWASM() {
        if (typeof createClangModule !== 'undefined') {
            try {
                this.Module = await createClangModule();
                this.available = true;
                console.log("✅ WASM C Compiler loaded");
                
                // Wrap C functions
                this.runLexer = this.Module.cwrap('run_lexer', 'string', ['string']);
                this.runAST = this.Module.cwrap('run_ast', 'string', ['string']);
                this.runIR = this.Module.cwrap('run_ir', 'string', ['string']);
                this.runOptimizedIR = this.Module.cwrap('run_optimized_ir', 'string', ['string']);
                this.runCodegen = this.Module.cwrap('run_codegen', 'string', ['string']);
                
                if (this.Module.set_user_input) {
                    this.Module.set_user_input = this.Module.cwrap('set_user_input', null, ['string']);
                }
            } catch (error) {
                console.warn("❌ Failed to load WASM compiler:", error);
                this.setupFallback();
            }
        } else {
            this.setupFallback();
        }
    }

    setupFallback() {
        console.log("⚠️ Using fallback C compiler");
        this.available = false;
        
        // Fallback implementations
        this.runLexer = this.fallbackLexer;
        this.runAST = this.fallbackAST;
        this.runIR = this.fallbackIR;
        this.runOptimizedIR = this.fallbackOptimizedIR;
        this.runCodegen = this.fallbackCodegen;
    }

    // Fallback implementations
    fallbackLexer(code) {
        const tokens = [];
        const regex = /\b[\w]+\b|[#<>(){}[\];",.=+\-*\/]/g;
        const matches = code.match(regex) || [];
        
        matches.forEach((token, index) => {
            let type = "IDENTIFIER";
            if (/^#/.test(token)) type = "PREPROCESSOR";
            else if (/^["']/.test(token)) type = "STRING";
            else if (/^\d+$/.test(token)) type = "NUMBER";
            else if (/^[(){}\[\]<>]$/.test(token)) type = "SYMBOL";
            else if (/^[=+\-*\/]$/.test(token)) type = "OPERATOR";
            else if (["int", "char", "float", "void", "return", "if", "else", 
                     "for", "while", "printf", "scanf"].includes(token)) type = "KEYWORD";
            
            tokens.push(`${index + 1}. ${type}: "${token}"`);
        });
        
        return tokens.length > 0 ? tokens.join("\n") : "No tokens found";
    }

    fallbackAST(code) {
        const ast = ["Abstract Syntax Tree:"];
        const lines = code.split('\n').filter(l => l.trim());
        
        ast.push("├── Program");
        
        lines.forEach((line, i) => {
            if (line.includes('#include')) {
                ast.push(`│   ├── Include: ${line.trim()}`);
            } else if (line.includes('int main')) {
                ast.push(`│   ├── FunctionDef: main`);
            } else if (line.includes('printf') || line.includes('scanf')) {
                ast.push(`│   │   ├── Statement: ${line.trim()}`);
            } else if (line.includes('return')) {
                ast.push(`│   │   └── Return: ${line.trim()}`);
            } else if (line.trim() && !line.trim().startsWith('//')) {
                ast.push(`│   │   ├── Expression: ${line.trim()}`);
            }
        });
        
        return ast.join("\n");
    }

    fallbackIR(code) {
        const ir = ["Intermediate Representation:"];
        
        if (code.includes('main')) {
            ir.push("entry:");
            ir.push("  push rbp");
            ir.push("  mov rbp, rsp");
            ir.push("  sub rsp, 16");
            
            if (code.includes('scanf')) {
                ir.push("  call scanf");
            }
            
            if (code.includes('printf')) {
                ir.push("  call printf");
            }
            
            ir.push("  xor eax, eax");
            ir.push("  leave");
            ir.push("  ret");
        }
        
        return ir.join("\n");
    }

    fallbackOptimizedIR(ir) {
        const optimized = ir.split('\n');
        if (optimized.length > 0) {
            optimized[0] = optimized[0] + " [OPTIMIZED]";
        }
        return optimized.join("\n");
    }

    fallbackCodegen(code) {
        const output = [];
        output.push("=== Program Output ===");
        output.push("(Fallback simulation mode)");
        output.push("Program would execute here...");
        output.push("");
        output.push("To enable full compilation:");
        output.push("1. Ensure clang-llvm-lld.js is available");
        output.push("2. Use a browser with WebAssembly support");
        output.push("3. Check console for errors");
        
        return output.join("\n");
    }

    // Public API
    async compile(code, userInput = "") {
        const startTime = performance.now();
        
        try {
            if (this.Module && this.Module.set_user_input && userInput) {
                this.Module.set_user_input(userInput);
            }
            
            const lexerOutput = this.runLexer(code);
            const lexerTime = performance.now() - startTime;
            
            const astOutput = this.runAST(code);
            const astTime = performance.now() - startTime - lexerTime;
            
            const irOutput = this.runIR(code);
            const irTime = performance.now() - startTime - lexerTime - astTime;
            
            const optimizedIR = this.runOptimizedIR(irOutput);
            const optimizedTime = performance.now() - startTime - lexerTime - astTime - irTime;
            
            const executionOutput = this.runCodegen(optimizedIR);
            const executionTime = performance.now() - startTime - lexerTime - astTime - irTime - optimizedTime;
            
            return {
                success: true,
                wasm: this.available,
                outputs: {
                    lexer: lexerOutput,
                    ast: astOutput,
                    ir: irOutput,
                    optimizedIR: optimizedIR,
                    execution: executionOutput
                },
                timing: {
                    lexer: lexerTime,
                    ast: astTime,
                    ir: irTime,
                    optimized: optimizedTime,
                    execution: executionTime,
                    total: performance.now() - startTime
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                outputs: {
                    execution: `Compilation Error: ${error.message}`
                }
            };
        }
    }
}

// Export for global use
window.CCompiler = CCompiler;