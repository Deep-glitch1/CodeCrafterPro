// comparison-manager.js
/**
 * ComparisonManager class - Creates phase-wise comparison between original and translated code
 * Shows differences at Lexing, Parsing, and Interpretation phases
 */

class ComparisonManager {
    constructor() {
        this.comparison = {
            lexing: null,
            parsing: null,
            interpretation: null
        };
    }

    /**
     * Compare tokens from original and translated code
     */
    compareLexingPhase(originalTokens, translatedTokens, originalCode, translatedCode) {
        const tokenComparison = {
            originalTokenCount: originalTokens.length,
            translatedTokenCount: translatedTokens.length,
            tokenDifference: translatedTokens.length - originalTokens.length,
            originalTokens: originalTokens.slice(0, 50), // Limit display
            translatedTokens: translatedTokens.slice(0, 50),
            tokenMapping: this.mapTokens(originalTokens, translatedTokens),
            statistics: {
                keywords: {
                    original: this.countTokenType(originalTokens, 'KEYWORD'),
                    translated: this.countTokenType(translatedTokens, 'KEYWORD')
                },
                identifiers: {
                    original: this.countTokenType(originalTokens, 'IDENTIFIER'),
                    translated: this.countTokenType(translatedTokens, 'IDENTIFIER')
                },
                numbers: {
                    original: this.countTokenType(originalTokens, 'NUMBER'),
                    translated: this.countTokenType(translatedTokens, 'NUMBER')
                },
                strings: {
                    original: this.countTokenType(originalTokens, 'STRING'),
                    translated: this.countTokenType(translatedTokens, 'STRING')
                },
                operators: {
                    original: this.countTokenType(originalTokens, 'OPERATOR'),
                    translated: this.countTokenType(translatedTokens, 'OPERATOR')
                }
            }
        };

        this.comparison.lexing = tokenComparison;
        return tokenComparison;
    }

    /**
     * Compare AST from original and translated code
     */
    comparePhasingPhase(originalAST, translatedAST, originalCode, translatedCode) {
        const astComparison = {
            originalAST: this.simplifyAST(originalAST),
            translatedAST: this.simplifyAST(translatedAST),
            structuralDifferences: this.findStructuralDifferences(originalAST, translatedAST),
            nodeComparison: {
                originalNodeCount: this.countNodes(originalAST),
                translatedNodeCount: this.countNodes(translatedAST),
                originalDepth: this.getASTDepth(originalAST),
                translatedDepth: this.getASTDepth(translatedAST)
            },
            semanticMapping: this.mapSemanticElements(originalAST, translatedAST)
        };

        this.comparison.parsing = astComparison;
        return astComparison;
    }

    /**
     * Compare outputs from original and translated code
     */
    compareInterpretationPhase(originalOutput, translatedOutput) {
        const outputComparison = {
            originalOutput: {
                success: originalOutput.success,
                result: originalOutput.output || originalOutput.result,
                errors: originalOutput.errors || [],
                executionTime: originalOutput.executionTime || 0
            },
            translatedOutput: {
                success: translatedOutput.success,
                result: translatedOutput.output || translatedOutput.result,
                errors: translatedOutput.errors || [],
                executionTime: translatedOutput.executionTime || 0
            },
            resultMatch: this.normalizeOutput(originalOutput.output || originalOutput.result) === 
                          this.normalizeOutput(translatedOutput.output || translatedOutput.result),
            outputDifferences: this.compareOutputLines(
                originalOutput.output || originalOutput.result,
                translatedOutput.output || translatedOutput.result
            )
        };

        this.comparison.interpretation = outputComparison;
        return outputComparison;
    }

    /**
     * Generate comprehensive phase comparison report
     */
    generateComparisonReport(originalCode, translatedCode, compiler) {
        const report = {
            timestamp: new Date().toISOString(),
            originalCode: originalCode,
            translatedCode: translatedCode,
            phases: {}
        };

        try {
            // Lexing phase
            console.log('📊 Comparing Lexing Phase...');
            const lexer = new ManualLexer(CONFIG.CUSTOM_KEYWORDS);
            const originalTokens = lexer.tokenize(originalCode);
            const translatedTokens = lexer.tokenize(translatedCode);
            report.phases.lexing = this.compareLexingPhase(originalTokens, translatedTokens, originalCode, translatedCode);

            // Parsing phase
            console.log('📊 Comparing Parsing Phase...');
            const parserOriginal = new ManualParser(originalTokens);
            const parserTranslated = new ManualParser(translatedTokens);
            const originalAST = parserOriginal.parse();
            const translatedAST = parserTranslated.parse();
            report.phases.parsing = this.comparePhasingPhase(originalAST, translatedAST, originalCode, translatedCode);

            // Interpretation phase
            console.log('📊 Comparing Interpretation Phase...');
            const compilerOriginal = new RealTimeCompiler(CONFIG.CUSTOM_KEYWORDS);
            const compilerTranslated = new RealTimeCompiler(CONFIG.CUSTOM_KEYWORDS);
            const originalResult = compilerOriginal.compile(originalCode);
            const translatedResult = compilerTranslated.compile(translatedCode);
            report.phases.interpretation = this.compareInterpretationPhase(originalResult, translatedResult);

            // Code metrics
            report.codeMetrics = this.generateCodeMetrics(originalCode, translatedCode);

            // Summary
            report.summary = this.generateSummary(report);

        } catch (error) {
            report.error = error.message;
            console.error('Error generating comparison report:', error);
        }

        return report;
    }

    /**
     * Helper: Count token types
     */
    countTokenType(tokens, type) {
        return tokens.filter(t => t.type === type).length;
    }

    /**
     * Helper: Map tokens between original and translated
     */
    mapTokens(originalTokens, translatedTokens) {
        const mapping = [];
        const minLength = Math.min(originalTokens.length, translatedTokens.length);

        for (let i = 0; i < minLength; i++) {
            mapping.push({
                original: originalTokens[i],
                translated: translatedTokens[i],
                match: originalTokens[i].type === translatedTokens[i].type
            });
        }

        return mapping;
    }

    /**
     * Helper: Simplify AST for comparison
     */
    simplifyAST(ast, depth = 0) {
        if (!ast) return null;
        if (depth > 10) return { type: 'TRUNCATED' }; // Prevent deep recursion

        if (Array.isArray(ast)) {
            return ast.map(node => this.simplifyAST(node, depth + 1));
        }

        if (typeof ast !== 'object') {
            return ast;
        }

        const simplified = {};
        for (const key in ast) {
            if (key !== 'parent' && key !== 'value') { // Exclude problematic keys
                simplified[key] = this.simplifyAST(ast[key], depth + 1);
            }
        }
        return simplified;
    }

    /**
     * Helper: Count nodes in AST
     */
    countNodes(ast) {
        if (!ast) return 0;
        if (Array.isArray(ast)) {
            return ast.reduce((sum, node) => sum + this.countNodes(node), 0);
        }
        if (typeof ast !== 'object') return 0;

        let count = 1;
        for (const key in ast) {
            if (ast.hasOwnProperty(key) && key !== 'parent') {
                count += this.countNodes(ast[key]);
            }
        }
        return count;
    }

    /**
     * Helper: Get AST depth
     */
    getASTDepth(ast, currentDepth = 0) {
        if (!ast || typeof ast !== 'object') return currentDepth;
        if (Array.isArray(ast)) {
            return Math.max(...ast.map(node => this.getASTDepth(node, currentDepth + 1)), currentDepth);
        }

        let maxDepth = currentDepth;
        for (const key in ast) {
            if (ast.hasOwnProperty(key) && key !== 'parent') {
                const depth = this.getASTDepth(ast[key], currentDepth + 1);
                maxDepth = Math.max(maxDepth, depth);
            }
        }
        return maxDepth;
    }

    /**
     * Helper: Find structural differences in AST
     */
    findStructuralDifferences(ast1, ast2) {
        const differences = [];
        // Basic comparison logic
        if (!ast1 && ast2) differences.push('Extra node in translated');
        if (ast1 && !ast2) differences.push('Missing node in translated');
        if (typeof ast1 !== typeof ast2) differences.push('Type mismatch');
        return differences;
    }

    /**
     * Helper: Map semantic elements (variables, functions, etc.)
     */
    mapSemanticElements(originalAST, translatedAST) {
        return {
            originalSemanticNodes: this.extractSemanticNodes(originalAST),
            translatedSemanticNodes: this.extractSemanticNodes(translatedAST)
        };
    }

    /**
     * Helper: Extract semantic nodes from AST
     */
    extractSemanticNodes(ast) {
        const nodes = [];
        if (!ast) return nodes;

        const traverse = (node) => {
            if (node && typeof node === 'object') {
                if (node.type && ['VARIABLE', 'FUNCTION', 'CALL', 'ASSIGNMENT'].includes(node.type)) {
                    nodes.push({
                        type: node.type,
                        name: node.name || node.value,
                        line: node.line
                    });
                }
                
                if (Array.isArray(node)) {
                    node.forEach(traverse);
                } else {
                    Object.values(node).forEach(traverse);
                }
            }
        };

        traverse(ast);
        return nodes;
    }

    /**
     * Helper: Normalize output for comparison
     */
    normalizeOutput(output) {
        if (!output) return '';
        return String(output).trim().replace(/\s+/g, ' ');
    }

    /**
     * Helper: Compare output lines
     */
    compareOutputLines(original, translated) {
        const originalLines = String(original || '').split('\n');
        const translatedLines = String(translated || '').split('\n');
        
        const differences = [];
        const maxLines = Math.max(originalLines.length, translatedLines.length);

        for (let i = 0; i < maxLines; i++) {
            if ((originalLines[i] || '') !== (translatedLines[i] || '')) {
                differences.push({
                    lineNumber: i + 1,
                    original: originalLines[i] || '[MISSING]',
                    translated: translatedLines[i] || '[MISSING]'
                });
            }
        }

        return differences;
    }

    /**
     * Generate code metrics
     */
    generateCodeMetrics(originalCode, translatedCode) {
        return {
            originalMetrics: this.getCodeMetrics(originalCode),
            translatedMetrics: this.getCodeMetrics(translatedCode),
            improvements: this.calculateImprovements(originalCode, translatedCode)
        };
    }

    /**
     * Helper: Get code metrics
     */
    getCodeMetrics(code) {
        return {
            lines: code.split('\n').length,
            characters: code.length,
            words: code.split(/\s+/).length,
            complexity: this.calculateLinesComplexity(code)
        };
    }

    /**
     * Helper: Calculate code complexity
     */
    calculateLinesComplexity(code) {
        return {
            loops: (code.match(/\b(while|for|jabtak)\b/gi) || []).length,
            conditionals: (code.match(/\b(if|else|agar|warna)\b/gi) || []).length,
            functions: (code.match(/\b(function|def|maano)\b/gi) || []).length,
            cyclomaticComplexity: Math.max(1, 
                (code.match(/jabtak|agar/g) || []).length + 
                (code.match(/warna/g) || []).length + 1)
        };
    }

    /**
     * Helper: Calculate improvements
     */
    calculateImprovements(original, translated) {
        const origMetrics = this.getCodeMetrics(original);
        const transMetrics = this.getCodeMetrics(translated);

        return {
            readabilityImprovement: (original.length - translated.length) / original.length * 100,
            lineReduction: ((origMetrics.lines - transMetrics.lines) / origMetrics.lines * 100).toFixed(2),
            characterReduction: ((origMetrics.characters - transMetrics.characters) / origMetrics.characters * 100).toFixed(2)
        };
    }

    /**
     * Generate summary of comparison
     */
    generateSummary(report) {
        let summary = '';
        
        if (report.phases.lexing) {
            summary += `\n📊 LEXING PHASE:\n`;
            summary += `  - Original Tokens: ${report.phases.lexing.originalTokenCount}\n`;
            summary += `  - Translated Tokens: ${report.phases.lexing.translatedTokenCount}\n`;
            summary += `  - Token Difference: ${report.phases.lexing.tokenDifference}\n`;
        }

        if (report.phases.parsing) {
            summary += `\n🌳 PARSING PHASE:\n`;
            summary += `  - Original AST Nodes: ${report.phases.parsing.nodeComparison.originalNodeCount}\n`;
            summary += `  - Translated AST Nodes: ${report.phases.parsing.nodeComparison.translatedNodeCount}\n`;
            summary += `  - Original Tree Depth: ${report.phases.parsing.nodeComparison.originalDepth}\n`;
            summary += `  - Translated Tree Depth: ${report.phases.parsing.nodeComparison.translatedDepth}\n`;
        }

        if (report.phases.interpretation) {
            summary += `\n⚙️ INTERPRETATION PHASE:\n`;
            summary += `  - Output Match: ${report.phases.interpretation.resultMatch ? '✅ YES' : '❌ NO'}\n`;
            summary += `  - Original Success: ${report.phases.interpretation.originalOutput.success ? '✅' : '❌'}\n`;
            summary += `  - Translated Success: ${report.phases.interpretation.translatedOutput.success ? '✅' : '❌'}\n`;
        }

        if (report.codeMetrics) {
            summary += `\n📈 CODE METRICS:\n`;
            summary += `  - Line Reduction: ${report.codeMetrics.improvements.lineReduction}%\n`;
            summary += `  - Character Reduction: ${report.codeMetrics.improvements.characterReduction}%\n`;
        }

        return summary;
    }

    /**
     * Get formatted comparison for display
     */
    getFormattedComparison() {
        return {
            lexing: this.formatPhaseComparison(this.comparison.lexing, 'LEXING'),
            parsing: this.formatPhaseComparison(this.comparison.parsing, 'PARSING'),
            interpretation: this.formatPhaseComparison(this.comparison.interpretation, 'INTERPRETATION')
        };
    }

    /**
     * Format phase comparison for display
     */
    formatPhaseComparison(phase, phaseName) {
        if (!phase) return null;

        return {
            phaseName,
            data: phase,
            html: this.generatePhaseHTML(phase, phaseName)
        };
    }

    /**
     * Generate HTML for phase display
     */
    generatePhaseHTML(phase, phaseName) {
        let html = `<div class="phase-comparison"><h3>${phaseName} Phase</h3>`;
        html += `<pre>${JSON.stringify(phase, null, 2).substring(0, 500)}...</pre>`;
        html += `</div>`;
        return html;
    }
}

// Export for use in browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComparisonManager;
}
