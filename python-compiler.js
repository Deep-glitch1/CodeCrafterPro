// python-compiler.js
// Lightweight Python compiler/interpreter (fallback-only)

class PythonCompiler {
    constructor() {
        this.available = false;
        this.setupFallback();
    }

    setupFallback() {
        this.runLexer = this.fallbackLexer.bind(this);
        this.runAST = this.fallbackAST.bind(this);
        this.runIR = this.fallbackIR.bind(this);
        this.runOptimizedIR = this.fallbackOptimizedIR.bind(this);
        this.runCodegen = this.fallbackExecution.bind(this);
    }

    fallbackLexer(code) {
        const tokens = [];
        const tokenRegex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+\.?\d*\b|\b[A-Za-z_][A-Za-z0-9_]*\b|==|!=|<=|>=|\*\*=?|\/\/=?|[+\-*/%=<>(){}\[\],.:;@])/g;
        const keywords = new Set([
            'def', 'return', 'if', 'else', 'elif', 'for', 'while', 'in', 'range',
            'print', 'import', 'from', 'as', 'class', 'pass', 'break', 'continue',
            'True', 'False', 'None', 'and', 'or', 'not', 'is', 'lambda', 'try',
            'except', 'finally', 'raise', 'with', 'yield', 'global', 'nonlocal',
            'assert', 'del'
        ]);

        const matches = code.match(tokenRegex) || [];
        matches.forEach((token, index) => {
            let type = 'IDENTIFIER';
            if (keywords.has(token)) {
                type = 'KEYWORD';
            } else if (/^\d+\.?\d*$/.test(token)) {
                type = 'NUMBER';
            } else if ((token.startsWith('"') && token.endsWith('"')) || 
                       (token.startsWith("'") && token.endsWith("'"))) {
                type = 'STRING';
            } else if (/^(==|!=|<=|>=|\*\*=?|\/\/=?|[+\-*/%=<>])$/.test(token)) {
                type = 'OPERATOR';
            } else if (/^[(){}\[\],.:;@]$/.test(token)) {
                type = 'PUNCTUATION';
            }

            tokens.push(`${index + 1}. ${type}: "${token}"`);
        });

        return tokens.length ? tokens.join('\n') : 'No tokens found';
    }

    fallbackAST(code) {
        const ast = ['Abstract Syntax Tree:', '└── Module'];
        const lines = code.split('\n');
        let indentLevel = 0;

        lines.forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;

            const currentIndent = line.search(/\S|$/);
            indentLevel = Math.floor(currentIndent / 4);

            const prefix = '    '.repeat(indentLevel + 1);

            if (/^def\s+/.test(trimmed)) {
                const name = trimmed.split(/\s+/)[1]?.split('(')[0] || 'function';
                const params = trimmed.match(/\(([^)]*)\)/)?.[1] || '';
                ast.push(`${prefix}├── FunctionDef: ${name}(${params})`);
                return;
            }
            if (/^class\s+/.test(trimmed)) {
                const name = trimmed.split(/\s+/)[1]?.split('(')[0] || 'Class';
                ast.push(`${prefix}├── ClassDef: ${name}`);
                return;
            }
            if (/^if\s+/.test(trimmed)) {
                ast.push(`${prefix}├── If: ${trimmed.replace(/:$/, '')}`);
                return;
            }
            if (/^elif\s+/.test(trimmed)) {
                ast.push(`${prefix}├── Elif: ${trimmed.replace(/:$/, '')}`);
                return;
            }
            if (/^else\s*:/.test(trimmed)) {
                ast.push(`${prefix}├── Else`);
                return;
            }
            if (/^for\s+/.test(trimmed)) {
                ast.push(`${prefix}├── For: ${trimmed.replace(/:$/, '')}`);
                return;
            }
            if (/^while\s+/.test(trimmed)) {
                ast.push(`${prefix}├── While: ${trimmed.replace(/:$/, '')}`);
                return;
            }
            if (/^print\s*\(/.test(trimmed) || /^print\s+/.test(trimmed)) {
                ast.push(`${prefix}├── Print`);
                return;
            }
            if (/^return\s/.test(trimmed)) {
                ast.push(`${prefix}├── Return: ${trimmed.replace(/^return\s+/, '')}`);
                return;
            }
            if (/^[A-Za-z_][A-Za-z0-9_]*\s*=/.test(trimmed)) {
                const name = trimmed.split('=')[0].trim();
                ast.push(`${prefix}├── Assign: ${name}`);
                return;
            }

            ast.push(`${prefix}├── Statement: ${trimmed}`);
        });

        return ast.join('\n');
    }

    fallbackIR(code) {
        const ir = ['Intermediate Representation:'];
        const lines = code.split('\n');

        lines.forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;

            if (/^def\s+/.test(trimmed)) {
                const name = trimmed.split(/\s+/)[1]?.split('(')[0] || 'func';
                ir.push(`  FUNC ${name}:`);
                return;
            }
            if (/^class\s+/.test(trimmed)) {
                const name = trimmed.split(/\s+/)[1]?.split('(')[0] || 'Class';
                ir.push(`  CLASS ${name}:`);
                return;
            }
            if (/^[A-Za-z_][A-Za-z0-9_]*\s*=/.test(trimmed)) {
                const parts = trimmed.split('=');
                ir.push(`  STORE ${parts[0].trim()} = ${parts.slice(1).join('=').trim()}`);
                return;
            }
            if (/^print\s*\(/.test(trimmed)) {
                const content = trimmed.match(/print\s*\((.+)\)/)?.[1] || '';
                ir.push(`  CALL print(${content})`);
                return;
            }
            if (/^print\s+/.test(trimmed)) {
                const content = trimmed.replace(/^print\s+/, '');
                ir.push(`  CALL print ${content}`);
                return;
            }
            if (/^if\s+/.test(trimmed)) {
                ir.push(`  BRANCH ${trimmed.replace(/:$/, '')}`);
                return;
            }
            if (/^elif\s+/.test(trimmed)) {
                ir.push(`  ELIF ${trimmed.replace(/:$/, '')}`);
                return;
            }
            if (/^else\s*:/.test(trimmed)) {
                ir.push(`  ELSE`);
                return;
            }
            if (/^for\s+/.test(trimmed)) {
                ir.push(`  LOOP ${trimmed.replace(/:$/, '')}`);
                return;
            }
            if (/^while\s+/.test(trimmed)) {
                ir.push(`  LOOP ${trimmed.replace(/:$/, '')}`);
                return;
            }
            if (/^return\s/.test(trimmed)) {
                ir.push(`  RETURN ${trimmed.replace(/^return\s+/, '')}`);
                return;
            }

            ir.push(`  EXEC ${trimmed}`);
        });

        return ir.join('\n');
    }

    fallbackOptimizedIR(ir) {
        const lines = ir.split('\n');
        if (lines.length) {
            lines[0] = `${lines[0]} [OPTIMIZED]`;
        }
        // Apply basic optimizations
        const optimized = lines.map(line => {
            // Constant folding: STORE x = 1 + 2 -> STORE x = 3
            line = line.replace(/STORE\s+(\w+)\s*=\s*(\d+)\s*\+\s*(\d+)/, (match, name, a, b) => {
                return `STORE ${name} = ${parseInt(a) + parseInt(b)}  ; folded: ${a} + ${b}`;
            });
            line = line.replace(/STORE\s+(\w+)\s*=\s*(\d+)\s*\*\s*(\d+)/, (match, name, a, b) => {
                return `STORE ${name} = ${parseInt(a) * parseInt(b)}  ; folded: ${a} * ${b}`;
            });
            return line;
        });
        return optimized.join('\n');
    }

    fallbackExecution(code, userInput = '') {
        const startTime = performance.now();
        const inputQueue = userInput.trim() ? userInput.trim().split(/\s*\n\s*/).filter(s => s.length > 0) : [];
        const warnings = [];
        const lines = code.split('\n');
        const parsed = [];

        const pushWarning = (message, line) => {
            warnings.push({
                message,
                line: line || 1,
                column: 1,
                severity: 'warning'
            });
        };

        const countIndent = (line) => {
            let count = 0;
            for (let i = 0; i < line.length; i += 1) {
                if (line[i] === ' ') count += 1;
                else if (line[i] === '\t') count += 4;
                else break;
            }
            return count;
        };

        // Parse lines into structured format
        lines.forEach((line, idx) => {
            const trimmed = line.trimEnd();
            if (!trimmed.trim() || trimmed.trim().startsWith('#')) return;
            parsed.push({
                lineNumber: idx + 1,
                indent: countIndent(trimmed),
                text: trimmed.trim()
            });
        });

        const env = {
            'True': true,
            'False': false,
            'None': null
        };
        const output = [];
        const maxLoopIterations = 10000;
        const maxRecursionDepth = 100;
        let recursionDepth = 0;

        const nextInput = (lineNumber) => {
            if (inputQueue.length) {
                const val = inputQueue.shift().trim();
                // Try to convert to number if possible
                return isNaN(val) ? val : parseFloat(val);
            }
            pushWarning('Input requested but no input provided', lineNumber);
            return '';
        };

        const tokenizeExpression = (expr, lineNumber) => {
            // Handle function calls like int(input()) or float(input())
            const resolved = expr
                .replace(/int\s*\(\s*input\s*\(\s*(['"].*?['"])?\s*\)\s*\)/g, () => {
                    const val = nextInput(lineNumber);
                    return String(parseInt(val) || 0);
                })
                .replace(/float\s*\(\s*input\s*\(\s*(['"].*?['"])?\s*\)\s*\)/g, () => {
                    const val = nextInput(lineNumber);
                    return String(parseFloat(val) || 0);
                })
                .replace(/input\s*\(\s*(['"].*?['"])?\s*\)/g, () => {
                    const val = nextInput(lineNumber);
                    // Return as string for input(), wrapped for proper handling
                    return typeof val === 'string' ? `"${val.replace(/"/g, '\\"')}"` : String(val);
                });

            const tokens = [];
            const regex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+\.?\d*\b|\b[A-Za-z_][A-Za-z0-9_]*\b|==|!=|<=|>=|\*\*|[+\-*/%()<>,])/g;
            let match;
            while ((match = regex.exec(resolved)) !== null) {
                tokens.push(match[0]);
            }
            return tokens;
        };

        const toValue = (token) => {
            if (token === 'True') return true;
            if (token === 'False') return false;
            if (token === 'None') return null;
            if (/^\d+\.?\d*$/.test(token)) return parseFloat(token);
            if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
                return token.slice(1, -1);
            }
            return env[token] !== undefined ? env[token] : 0;
        };

        const evaluateTokens = (tokens, lineNumber) => {
            // Shunting yard algorithm for expression evaluation
            const outputQueue = [];
            const operators = [];
            const precedence = { 
                '**': 4,
                '*': 3, '/': 3, '%': 3, '//': 3,
                '+': 2, '-': 2,
                '<': 1, '>': 1, '<=': 1, '>=': 1, '==': 1, '!=': 1
            };
            const rightAssociative = new Set(['**']);

            const peek = (arr) => arr[arr.length - 1];

            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                
                if (token === '(') {
                    operators.push(token);
                } else if (token === ')') {
                    while (operators.length && peek(operators) !== '(') {
                        outputQueue.push(operators.pop());
                    }
                    if (operators.length && peek(operators) === '(') {
                        operators.pop();
                    } else {
                        pushWarning('Mismatched parentheses', lineNumber);
                    }
                } else if (token === ',') {
                    while (operators.length && peek(operators) !== '(') {
                        outputQueue.push(operators.pop());
                    }
                } else if (precedence[token] !== undefined) {
                    // Handle unary minus
                    if (token === '-' && (i === 0 || tokens[i-1] === '(' || precedence[tokens[i-1]] !== undefined)) {
                        outputQueue.push('0'); // Push 0 for unary minus
                    }
                    
                    while (operators.length && peek(operators) !== '(' && 
                           (precedence[peek(operators)] > precedence[token] ||
                            (precedence[peek(operators)] === precedence[token] && !rightAssociative.has(token)))) {
                        outputQueue.push(operators.pop());
                    }
                    operators.push(token);
                } else {
                    outputQueue.push(token);
                }
            }

            while (operators.length) {
                const op = operators.pop();
                if (op === '(') {
                    pushWarning('Mismatched parentheses', lineNumber);
                } else {
                    outputQueue.push(op);
                }
            }

            // Evaluate RPN
            const stack = [];
            for (const token of outputQueue) {
                if (precedence[token] !== undefined) {
                    const right = stack.pop();
                    const left = stack.pop();
                    
                    if (right === undefined || left === undefined) {
                        pushWarning('Invalid expression', lineNumber);
                        stack.push(0);
                        continue;
                    }
                    
                    const leftVal = toValue(left);
                    const rightVal = toValue(right);

                    // Handle string concatenation
                    if (token === '+' && (typeof leftVal === 'string' || typeof rightVal === 'string')) {
                        stack.push(String(leftVal) + String(rightVal));
                        continue;
                    }
                    
                    // Handle string repetition
                    if (token === '*' && typeof leftVal === 'string' && typeof rightVal === 'number') {
                        stack.push(leftVal.repeat(rightVal));
                        continue;
                    }
                    if (token === '*' && typeof rightVal === 'string' && typeof leftVal === 'number') {
                        stack.push(rightVal.repeat(leftVal));
                        continue;
                    }

                    // Numeric only operations
                    if ((typeof leftVal === 'string' || typeof rightVal === 'string') && token !== '+') {
                        pushWarning(`Cannot perform ${token} on strings`, lineNumber);
                        stack.push(0);
                        continue;
                    }

                    switch (token) {
                        case '+': stack.push(leftVal + rightVal); break;
                        case '-': stack.push(leftVal - rightVal); break;
                        case '*': stack.push(leftVal * rightVal); break;
                        case '/':
                            if (rightVal === 0) {
                                pushWarning('Division by zero', lineNumber);
                                stack.push(0);
                            } else {
                                stack.push(leftVal / rightVal);
                            }
                            break;
                        case '//':
                            if (rightVal === 0) {
                                pushWarning('Division by zero', lineNumber);
                                stack.push(0);
                            } else {
                                stack.push(Math.floor(leftVal / rightVal));
                            }
                            break;
                        case '%':
                            if (rightVal === 0) {
                                pushWarning('Modulo by zero', lineNumber);
                                stack.push(0);
                            } else {
                                stack.push(leftVal % rightVal);
                            }
                            break;
                        case '**': stack.push(Math.pow(leftVal, rightVal)); break;
                        case '<': stack.push(leftVal < rightVal); break;
                        case '>': stack.push(leftVal > rightVal); break;
                        case '<=': stack.push(leftVal <= rightVal); break;
                        case '>=': stack.push(leftVal >= rightVal); break;
                        case '==': stack.push(leftVal === rightVal); break;
                        case '!=': stack.push(leftVal !== rightVal); break;
                    }
                } else {
                    stack.push(token);
                }
            }

            const result = stack.pop();
            return result !== undefined ? toValue(result) : 0;
        };

        const evaluateExpression = (expr, lineNumber) => {
            const tokens = tokenizeExpression(expr, lineNumber);
            if (!tokens.length) return 0;
            return evaluateTokens(tokens, lineNumber);
        };

        const safeEvaluateExpression = (expr, lineNumber) => {
            try {
                return evaluateExpression(expr, lineNumber);
            } catch (error) {
                pushWarning(`Expression error: ${error.message}`, lineNumber);
                return 0;
            }
        };

        const evaluateCondition = (expr, lineNumber) => {
            // Handle 'and', 'or', 'not' operators
            let processed = expr
                .replace(/\band\b/g, '&&')
                .replace(/\bor\b/g, '||')
                .replace(/\bnot\b\s+/g, '!')
                .replace(/\bis\s+not\b/g, '!=')
                .replace(/\bis\b(?!\s+not)/g, '==')
                .replace(/\bin\b/g, ' in '); // Will be handled separately
            
            // Handle 'in' operator
            if (processed.includes(' in ')) {
                const [left, right] = processed.split(' in ').map(s => s.trim());
                const leftVal = safeEvaluateExpression(left, lineNumber);
                const rightVal = safeEvaluateExpression(right, lineNumber);
                if (typeof rightVal === 'string') {
                    return rightVal.includes(String(leftVal));
                }
                return false;
            }

            // Handle boolean literals
            processed = processed.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false');
            
            // If it's a complex expression, evaluate it
            if (/[<>=!+\-*/]/.test(processed)) {
                return Boolean(safeEvaluateExpression(processed, lineNumber));
            }
            
            // Simple truthiness check
            const val = safeEvaluateExpression(processed, lineNumber);
            return Boolean(val);
        };

        const splitPrintArgs = (content) => {
            const args = [];
            let current = '';
            let inString = false;
            let stringChar = '';
            let parenDepth = 0;
            
            for (let i = 0; i < content.length; i += 1) {
                const ch = content[i];
                
                if ((ch === '"' || ch === "'") && (i === 0 || content[i - 1] !== '\\')) {
                    if (!inString) {
                        inString = true;
                        stringChar = ch;
                    } else if (stringChar === ch) {
                        inString = false;
                    }
                }
                
                if (!inString) {
                    if (ch === '(') parenDepth++;
                    if (ch === ')') parenDepth--;
                }
                
                if (ch === ',' && !inString && parenDepth === 0) {
                    args.push(current.trim());
                    current = '';
                } else {
                    current += ch;
                }
            }
            if (current.trim()) args.push(current.trim());
            return args;
        };

        // FIXED: Proper nested block handling
        const getBlockEnd = (startIndex, indentLevel) => {
            let i = startIndex;
            while (i < parsed.length) {
                const entry = parsed[i];
                // Only stop if indent is LESS THAN OR EQUAL to the block's indent level
                // Inner blocks will have GREATER indent, so they get skipped
                if (entry.indent <= indentLevel) return i;
                i += 1;
            }
            return i;
        };

        const executeLines = (startIndex, currentIndent) => {
            if (recursionDepth > maxRecursionDepth) {
                pushWarning('Maximum recursion depth exceeded', parsed[startIndex]?.lineNumber || 1);
                return startIndex;
            }
            recursionDepth++;
            
            let i = startIndex;
            while (i < parsed.length) {
                const entry = parsed[i];
                
                // Stop if we've exited this block
                if (entry.indent < currentIndent) {
                    recursionDepth--;
                    return i;
                }
                
                // Skip lines with unexpected indent
                if (entry.indent > currentIndent) {
                    pushWarning('Unexpected indent', entry.lineNumber);
                    i += 1;
                    continue;
                }

                if (entry.indent % 4 !== 0) {
                    pushWarning('Indentation should use multiples of 4 spaces', entry.lineNumber);
                }

                const text = entry.text;

                // Handle if/elif/else
                if (/^if\s+/.test(text)) {
                    if (!/:$/.test(text)) {
                        pushWarning('Missing ":" after if statement', entry.lineNumber);
                        i += 1;
                        continue;
                    }
                    const condition = text.replace(/^if\s+/, '').replace(/:$/, '');
                    const bodyStart = i + 1;
                    const bodyEnd = getBlockEnd(bodyStart, currentIndent);
                    
                    // Find elif/else at same indent level
                    let elifChain = [];
                    let nextCheck = bodyEnd;
                    while (nextCheck < parsed.length && parsed[nextCheck]?.indent === currentIndent) {
                        const nextText = parsed[nextCheck].text;
                        if (/^elif\s+/.test(nextText)) {
                            const elifCondition = nextText.replace(/^elif\s+/, '').replace(/:$/, '');
                            const elifBodyStart = nextCheck + 1;
                            const elifBodyEnd = getBlockEnd(elifBodyStart, currentIndent);
                            elifChain.push({ condition: elifCondition, bodyStart: elifBodyStart, bodyEnd: elifBodyEnd });
                            nextCheck = elifBodyEnd;
                        } else if (/^else\s*:/.test(nextText)) {
                            const elseBodyStart = nextCheck + 1;
                            const elseBodyEnd = getBlockEnd(elseBodyStart, currentIndent);
                            elifChain.push({ condition: null, bodyStart: elseBodyStart, bodyEnd: elseBodyEnd }); // null = else
                            nextCheck = elseBodyEnd;
                            break;
                        } else {
                            break;
                        }
                    }
                    
                    // Evaluate conditions
                    let executed = false;
                    if (evaluateCondition(condition, entry.lineNumber)) {
                        executeLines(bodyStart, currentIndent + 4);
                        executed = true;
                    } else {
                        for (const branch of elifChain) {
                            if (branch.condition === null || evaluateCondition(branch.condition, entry.lineNumber)) {
                                executeLines(branch.bodyStart, currentIndent + 4);
                                executed = true;
                                break;
                            }
                        }
                    }
                    
                    // Skip to after all branches
                    i = elifChain.length > 0 ? elifChain[elifChain.length - 1].bodyEnd : bodyEnd;
                    continue;
                }

                // Handle for loops
                if (/^for\s+/.test(text)) {
                    if (!/:$/.test(text)) {
                        pushWarning('Missing ":" after for statement', entry.lineNumber);
                        i += 1;
                        continue;
                    }
                    
                    // Try range-based for
                    let match = text.match(/^for\s+(\w+)\s+in\s+range\s*\(([^)]*)\)\s*:/);
                    if (match) {
                        const varName = match[1];
                        const rangeArgs = match[2].split(',').map(v => v.trim()).filter(Boolean);
                        if (!rangeArgs.length) {
                            pushWarning('Range requires at least one argument', entry.lineNumber);
                            i += 1;
                            continue;
                        }
                        let start = 0;
                        let end = 0;
                        let step = 1;
                        if (rangeArgs.length === 1) {
                            end = safeEvaluateExpression(rangeArgs[0], entry.lineNumber);
                        } else if (rangeArgs.length >= 2) {
                            start = safeEvaluateExpression(rangeArgs[0], entry.lineNumber);
                            end = safeEvaluateExpression(rangeArgs[1], entry.lineNumber);
                            if (rangeArgs[2]) step = safeEvaluateExpression(rangeArgs[2], entry.lineNumber);
                        }
                        
                        const bodyStart = i + 1;
                        const bodyEnd = getBlockEnd(bodyStart, currentIndent);
                        let count = 0;
                        for (let val = start; step >= 0 ? val < end : val > end; val += step) {
                            env[varName] = val;
                            executeLines(bodyStart, currentIndent + 4);
                            count += 1;
                            if (count > maxLoopIterations) {
                                pushWarning('Loop iteration limit reached', entry.lineNumber);
                                break;
                            }
                        }
                        i = bodyEnd;
                        continue;
                    }
                    
                    // Try iterable-based for
                    match = text.match(/^for\s+(\w+)\s+in\s+(.+?)\s*:/);
                    if (match) {
                        const varName = match[1];
                        const iterableExpr = match[2];
                        const iterable = safeEvaluateExpression(iterableExpr, entry.lineNumber);
                        
                        const bodyStart = i + 1;
                        const bodyEnd = getBlockEnd(bodyStart, currentIndent);
                        
                        if (typeof iterable === 'string') {
                            let count = 0;
                            for (const char of iterable) {
                                env[varName] = char;
                                executeLines(bodyStart, currentIndent + 4);
                                count++;
                                if (count > maxLoopIterations) {
                                    pushWarning('Loop iteration limit reached', entry.lineNumber);
                                    break;
                                }
                            }
                        } else if (Array.isArray(iterable)) {
                            let count = 0;
                            for (const item of iterable) {
                                env[varName] = item;
                                executeLines(bodyStart, currentIndent + 4);
                                count++;
                                if (count > maxLoopIterations) {
                                    pushWarning('Loop iteration limit reached', entry.lineNumber);
                                    break;
                                }
                            }
                        }
                        i = bodyEnd;
                        continue;
                    }
                    
                    pushWarning('Unsupported for-loop syntax', entry.lineNumber);
                    i += 1;
                    continue;
                }

                // Handle while loops
                if (/^while\s+/.test(text)) {
                    if (!/:$/.test(text)) {
                        pushWarning('Missing ":" after while statement', entry.lineNumber);
                        i += 1;
                        continue;
                    }
                    const condition = text.replace(/^while\s+/, '').replace(/:$/, '');
                    const bodyStart = i + 1;
                    const bodyEnd = getBlockEnd(bodyStart, currentIndent);
                    let count = 0;
                    while (evaluateCondition(condition, entry.lineNumber)) {
                        executeLines(bodyStart, currentIndent + 4);
                        count += 1;
                        if (count > maxLoopIterations) {
                            pushWarning('Loop iteration limit reached', entry.lineNumber);
                            break;
                        }
                    }
                    i = bodyEnd;
                    continue;
                }

                // Handle print statements
                if (/^print\s*\(/.test(text)) {
                    const inside = text.match(/print\s*\((.+)\)\s*$/)?.[1];
                    if (inside) {
                        const parts = splitPrintArgs(inside);
                        const evaluatedParts = parts.map(part => {
                            const val = safeEvaluateExpression(part, entry.lineNumber);
                            return val === null ? 'None' : String(val);
                        });
                        output.push(evaluatedParts.join(' '));
                    } else {
                        output.push('');
                    }
                    i += 1;
                    continue;
                }

                if (/^print\s+/.test(text)) {
                    const value = text.replace(/^print\s+/, '');
                    const result = safeEvaluateExpression(value, entry.lineNumber);
                    output.push(result === null ? 'None' : String(result));
                    i += 1;
                    continue;
                }

                // Handle return statements
                if (/^return\s/.test(text)) {
                    const value = text.replace(/^return\s+/, '');
                    const result = value ? safeEvaluateExpression(value, entry.lineNumber) : null;
                    recursionDepth--;
                    return { returned: true, value: result, nextIndex: i + 1 };
                }

                // Handle variable assignments
                if (/^[A-Za-z_][A-Za-z0-9_]*\s*=/.test(text)) {
                    const eqIndex = text.indexOf('=');
                    const leftSide = text.substring(0, eqIndex).trim();
                    const rightSide = text.substring(eqIndex + 1).trim();
                    
                    // Handle compound assignments (+=, -=, etc.)
                    const compoundMatch = leftSide.match(/^(\w+)\s*([+\-*/%])=$/);
                    if (compoundMatch) {
                        const varName = compoundMatch[1];
                        const op = compoundMatch[2];
                        const currentVal = env[varName] !== undefined ? env[varName] : 0;
                        const rightVal = safeEvaluateExpression(rightSide, entry.lineNumber);
                        switch (op) {
                            case '+': env[varName] = currentVal + rightVal; break;
                            case '-': env[varName] = currentVal - rightVal; break;
                            case '*': env[varName] = currentVal * rightVal; break;
                            case '/': env[varName] = rightVal !== 0 ? currentVal / rightVal : 0; break;
                            case '%': env[varName] = rightVal !== 0 ? currentVal % rightVal : 0; break;
                        }
                    } else {
                        env[leftSide] = safeEvaluateExpression(rightSide, entry.lineNumber);
                    }
                    i += 1;
                    continue;
                }

                // Handle break and continue
                if (/^break\s*$/.test(text)) {
                    recursionDepth--;
                    return { break: true, nextIndex: i + 1 };
                }
                if (/^continue\s*$/.test(text)) {
                    recursionDepth--;
                    return { continue: true, nextIndex: i + 1 };
                }
                if (/^pass\s*$/.test(text)) {
                    i += 1;
                    continue;
                }

                // Handle function/class definitions (skip in fallback)
                if (/^(def|class)\s+/.test(text)) {
                    const bodyStart = i + 1;
                    const bodyEnd = getBlockEnd(bodyStart, currentIndent);
                    pushWarning('Function/class definitions are not executed in fallback mode', entry.lineNumber);
                    i = bodyEnd;
                    continue;
                }

                // Fallback: try as expression
                pushWarning(`Unsupported statement: ${text.substring(0, 50)}`, entry.lineNumber);
                i += 1;
            }
            
            recursionDepth--;
            return i;
        };

        try {
            const result = executeLines(0, 0);
            
            // Check if there was a return value
            const resultString = output.length ? output.join('\n') : '(No output)';
            
            return {
                output: resultString,
                toString() { return resultString; },
                timing: {
                    execution: performance.now() - startTime
                },
                warnings,
                hasErrors: warnings.length > 0
            };
        } catch (error) {
            const errorOutput = `Execution Error: ${error.message}\nStack: ${error.stack}`;
            return {
                output: errorOutput,
                toString() { return errorOutput; },
                timing: {
                    execution: performance.now() - startTime
                },
                warnings: [...warnings, {
                    message: error.message,
                    line: 1,
                    column: 1,
                    severity: 'error'
                }],
                hasErrors: true
            };
        }
    }

    async compile(code, userInput = '') {
        const startTime = performance.now();
        try {
            const lexerOutput = this.runLexer(code);
            const lexerTime = performance.now() - startTime;

            const astOutput = this.runAST(code);
            const astTime = performance.now() - startTime - lexerTime;

            const irOutput = this.runIR(code);
            const irTime = performance.now() - startTime - lexerTime - astTime;

            const optimizedIR = this.runOptimizedIR(irOutput);
            const optimizedTime = performance.now() - startTime - lexerTime - astTime - irTime;

            const executionResult = this.runCodegen(code, userInput);
            const executionTime = executionResult.timing?.execution || 
                (performance.now() - startTime - lexerTime - astTime - irTime - optimizedTime);

            return {
                success: !executionResult.hasErrors,
                wasm: false,
                outputs: {
                    lexer: lexerOutput,
                    ast: astOutput,
                    ir: irOutput,
                    optimizedIR: optimizedIR,
                    execution: executionResult.output
                },
                warnings: executionResult.warnings || [],
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
                    execution: `Compilation Error: ${error.message}\n\nStack Trace:\n${error.stack}`
                }
            };
        }
    }
}

window.PythonCompiler = PythonCompiler;