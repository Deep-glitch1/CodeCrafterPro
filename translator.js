// translator.js
/**
 * Translator class - Converts C/Python code to Custom Language
 * Supports translation at different compiler phases
 */

class CodeTranslator {
    constructor() {
        this.customKeywords = CONFIG.CUSTOM_KEYWORDS;
        this.translationMap = new Map();
        this.initializeTranslationPatterns();
    }

    initializeTranslationPatterns() {
        // C/Python patterns to Custom Language patterns
        this.patterns = {
            // Variable declarations
            varDeclaration: {
                c: /\b(int|float|char|double|string|var|let|const)\s+(\w+)\s*=\s*(.+?)[;]/g,
                python: /^(\w+)\s*=\s*(.+?)$/gm,
                custom: 'maano {varName} = {value}'
            },
            // Print statements
            print: {
                c: /printf\s*\(\s*"([^"]*)"\s*(?:\s*,\s*([^)]*))?\s*\)/g,
                python: /print\s*\(\s*([^)]+)\s*\)/g,
                custom: 'likho {content}'
            },
            // If statements
            ifStatement: {
                c: /if\s*\(\s*(.+?)\s*\)\s*\{/g,
                python: /if\s+(.+?)\s*:/g,
                custom: 'agar {condition} {'
            },
            // Else statements
            elseStatement: {
                c: /\}\s*else\s*\{/g,
                python: /else\s*:/g,
                custom: '} warna {'
            },
            // While loops
            whileLoop: {
                c: /while\s*\(\s*(.+?)\s*\)\s*\{/g,
                python: /while\s+(.+?)\s*:/g,
                custom: 'jabtak {condition} {'
            },
            // For loops (convert to while)
            forLoop: {
                c: /for\s*\(\s*(.+?)\s*;\s*(.+?)\s*;\s*(.+?)\s*\)\s*\{/g,
                python: /for\s+(\w+)\s+in\s+(.+?)\s*:/g,
                custom: 'jabtak {condition} {'
            }
        };
    }

    /**
     * Translate C code to Custom Language
     */
    translateFromC(cCode) {
        let customCode = cCode;

        // Remove #include statements
        customCode = customCode.replace(/#include\s*[<"].*?[>"]/g, '');

        // Remove int main() { ... } wrapper completely
        // First, find and remove the main function declaration
        customCode = customCode.replace(/int\s+main\s*\(\s*\)\s*\{/g, '');
        
        // Remove return 0; or return <digit>;
        customCode = customCode.replace(/\s*return\s+\d+\s*;\s*/g, '');

        // ⭐️ IMPORTANT: Convert for loops FIRST (before variable declarations)
        // This prevents the variable inside for loop from being converted separately
        // Match: for(int i = 1; i <= x; i++) -> maano i = 1\njabtak i <= x {
        customCode = customCode.replace(
            /for\s*\(\s*(?:int|float|double|char|string)?\s*(\w+)\s*=\s*(\d+)\s*;\s*(\w+)\s*([<>=!]+)\s*(\d+)\s*;\s*(\w+)\s*(\+\+|--)\s*\)\s*\{/g,
            (match, p1, p2, p3, p4, p5) => {
                return `maano ${p1} = ${p2}\njabtak ${p3} ${p4} ${p5} {`;
            }
        );

        // Convert while loops (also do this before variable declarations)
        customCode = customCode.replace(/while\s*\(\s*(.+?)\s*\)\s*\{/g, 
            'jabtak $1 {');

        // Now convert remaining variable declarations (int x = 5; -> maano x = 5)
        customCode = customCode.replace(/\b(int|float|char|double|string)\s+(\w+)\s*=\s*(.+?);/g, 
            'maano $2 = $3');
        customCode = customCode.replace(/\b(int|float|char|double|string)\s+(\w+);/g, 
            'maano $2 = 0');

        // Convert printf statements (printf("text", var); -> likho "text" + var)
        customCode = customCode.replace(/printf\s*\(\s*"([^"]*)"\s*,\s*([^)]+)\s*\)\s*;?/g, 
            'likho "$1 " + $2');
        customCode = customCode.replace(/printf\s*\(\s*"([^"]*)"\s*\)\s*;?/g, 
            'likho "$1"');

        // Ensure likho statements don't have semicolons (remove if present)
        customCode = customCode.replace(/likho\s+(.+?);\s*/g, 'likho $1\n');
        // Ensure likho statements end with newline if not already
        customCode = customCode.replace(/likho\s+([^\n;]+)(?![\n;])/g, 'likho $1\n');

        // Convert scanf to likho (user input simulation)
        customCode = customCode.replace(/scanf\s*\([^)]+\)/g, 
            '// likho "Enter input:"');

        // Convert if statements
        customCode = customCode.replace(/if\s*\(\s*(.+?)\s*\)\s*\{/g, 
            'agar $1 {');

        // Convert else statements
        customCode = customCode.replace(/\}\s*else\s*\{/g, 
            '} warna {');

        // NOW remove trailing closing braces (AFTER all conversions)
        // Only remove braces that are unmatched at the very end
        let lines = customCode.split('\n');
        
        // Clean up empty lines while preserving content
        lines = lines.filter(line => line.trim() !== '');

        // Remove only the final unmatched closing braces (from main function)
        let braceCount = 0;
        
        // First pass: count braces to find the balance
        for (let i = 0; i < lines.length; i++) {
            const openBraces = (lines[i].match(/\{/g) || []).length;
            const closeBraces = (lines[i].match(/\}/g) || []).length;
            braceCount += openBraces - closeBraces;
        }

        // Second pass: remove excess closing braces from the end
        while (braceCount < 0 && lines.length > 0) {
            const lastLine = lines[lines.length - 1].trim();
            
            // If last line is just a closing brace, remove it
            if (lastLine === '}') {
                lines.pop();
                braceCount++;
            } else {
                // Otherwise, stop removing
                break;
            }
        }

        customCode = lines.join('\n');

        return customCode.trim();
    }

    /**
     * Translate Python code to Custom Language
     */
    translateFromPython(pythonCode) {
        let customCode = pythonCode;

        // Remove comments
        customCode = customCode.replace(/#.*/g, '');

        // Convert variable assignments (x = 5 -> maano x = 5)
        customCode = customCode.replace(/^(\w+)\s*=\s*(.+?)$/gm, 
            'maano $1 = $2');

        // Convert print statements
        customCode = customCode.replace(/print\s*\(\s*"([^"]*)"(?:\s*,\s*([^)]*))?\s*\)/g, 
            (match, p1, p2) => {
                if (p2) {
                    return `likho "${p1}" + ${p2}`;
                }
                return `likho "${p1}"`;
            });

        // Handle print with concatenation
        customCode = customCode.replace(/print\s*\(\s*([^)]+)\s*\)/g, 
            'likho $1');

        // Convert if statements (remove : and adjust braces)
        customCode = customCode.replace(/if\s+(.+?)\s*:\s*\n/g, 
            'agar $1 {\n');

        // Convert else statements
        customCode = customCode.replace(/else\s*:\s*\n/g, 
            '} warna {\n');

        // Convert elif to else if
        customCode = customCode.replace(/elif\s+(.+?)\s*:\s*\n/g, 
            '} agar $1 {\n');

        // Convert while loops
        customCode = customCode.replace(/while\s+(.+?)\s*:\s*\n/g, 
            'jabtak $1 {\n');

        // Convert for loops
        customCode = customCode.replace(/for\s+(\w+)\s+in\s+range\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)\s*:\s*\n/g, 
            'maano $1 = $2\njabtak $1 < $3 {\n');

        // Handle indentation (remove leading spaces but ensure proper structure)
        const lines = customCode.split('\n');
        let braceCount = 0;
        customCode = lines.map(line => {
            const trimmed = line.trim();
            if (trimmed === '') return '';
            
            // Decrease indent before closing brace
            if (trimmed.startsWith('}')) {
                braceCount--;
            }
            
            // Add closing brace for indented blocks
            const leadingSpaces = line.match(/^\s*/)[0].length;
            const indent = Math.floor(leadingSpaces / 4);
            
            // Increase indent after opening brace
            if (trimmed.endsWith('{')) {
                braceCount++;
            }
            
            return trimmed;
        }).filter(line => line !== '').join('\n');

        // Add closing braces
        while (braceCount > 0) {
            customCode += '\n}';
            braceCount--;
        }

        return customCode.trim();
    }

    /**
     * Translate any supported language to Custom Language
     */
    translate(code, sourceLanguage) {
        this.translationMap.clear();
        
        let translatedCode = '';
        switch (sourceLanguage.toLowerCase()) {
            case 'c':
            case 'cpp':
            case 'c++':
                translatedCode = this.translateFromC(code);
                break;
            case 'python':
            case 'py':
                translatedCode = this.translateFromPython(code);
                break;
            case 'custom':
                translatedCode = code;
                break;
            default:
                throw new Error(`Unsupported source language: ${sourceLanguage}`);
        }

        return translatedCode;
    }

    /**
     * Get translation details
     */
    getTranslationDetails(originalCode, translatedCode) {
        return {
            originalLength: originalCode.length,
            translatedLength: translatedCode.length,
            originalLines: originalCode.split('\n').length,
            translatedLines: translatedCode.split('\n').length,
            complexity: this.calculateComplexity(originalCode, translatedCode)
        };
    }

    /**
     * Calculate code complexity for both original and translated
     */
    calculateComplexity(originalCode, translatedCode) {
        // Count loops in ORIGINAL code (for, while, jabtak)
        const originalLoops = (originalCode.match(/\b(for|while)\s*[\(\w]/gi) || []).length;
        
        // Count loops in TRANSLATED code (jabtak should be there after translation)
        const translatedLoops = (translatedCode.match(/jabtak\s+/g) || []).length;
        
        // Use original loop count (more accurate for C/Python code)
        const loopCount = Math.max(originalLoops, translatedLoops);
        
        let complexity = {
            variables: (originalCode.match(/\b(int|float|char|double|string|var|let|const|maano)\s+\w+/gi) || []).length,
            printStatements: (originalCode.match(/\b(printf|print|likho)\s*[\(\s"]/gi) || []).length,
            conditionals: ((originalCode.match(/\b(if|agar)\b/gi) || []).length + (originalCode.match(/\b(else|warna)\b/gi) || []).length),
            loops: loopCount
        };
        return complexity;
    }
}

// Export for use in browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CodeTranslator;
}
