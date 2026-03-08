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
        const tokenRegex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+\b|\b[A-Za-z_][A-Za-z0-9_]*\b|==|!=|<=|>=|[=+\-*/<>():,])/g;
        const keywords = new Set([
            'def', 'return', 'if', 'else', 'elif', 'for', 'while', 'in', 'range',
            'print', 'import', 'from', 'as', 'class', 'pass', 'break', 'continue'
        ]);

        const matches = code.match(tokenRegex) || [];
        matches.forEach((token, index) => {
            let type = 'IDENTIFIER';
            if (keywords.has(token)) type = 'KEYWORD';
            else if (/^\d+$/.test(token)) type = 'NUMBER';
            else if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) type = 'STRING';
            else if (/^[=+\-*/<>]$/.test(token) || ['==', '!=', '<=', '>='].includes(token)) type = 'OPERATOR';
            else if (/^[():,]$/.test(token)) type = 'PUNCT';

            tokens.push(`${index + 1}. ${type}: "${token}"`);
        });

        return tokens.length ? tokens.join('\n') : 'No tokens found';
    }

    fallbackAST(code) {
        const ast = ['Abstract Syntax Tree:', '└── Module'];
        const lines = code.split('\n');

        lines.forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;

            if (/^def\s+/.test(trimmed)) {
                const name = trimmed.split(/\s+/)[1]?.split('(')[0] || 'function';
                ast.push(`    ├── FunctionDef: ${name}`);
                return;
            }
            if (/^class\s+/.test(trimmed)) {
                const name = trimmed.split(/\s+/)[1]?.split('(')[0] || 'Class';
                ast.push(`    ├── ClassDef: ${name}`);
                return;
            }
            if (/^if\s+/.test(trimmed)) {
                ast.push(`    ├── If: ${trimmed.replace(/:$/, '')}`);
                return;
            }
            if (/^for\s+/.test(trimmed)) {
                ast.push(`    ├── For: ${trimmed.replace(/:$/, '')}`);
                return;
            }
            if (/^while\s+/.test(trimmed)) {
                ast.push(`    ├── While: ${trimmed.replace(/:$/, '')}`);
                return;
            }
            if (/^print\s*\(/.test(trimmed) || /^print\s+/.test(trimmed)) {
                ast.push('    ├── Print');
                return;
            }
            if (/^[A-Za-z_][A-Za-z0-9_]*\s*=/.test(trimmed)) {
                const name = trimmed.split('=')[0].trim();
                ast.push(`    ├── Assign: ${name}`);
                return;
            }

            ast.push(`    ├── Statement: ${trimmed}`);
        });

        return ast.join('\n');
    }

    fallbackIR(code) {
        const ir = ['Intermediate Representation:'];
        const lines = code.split('\n');

        lines.forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;

            if (/^[A-Za-z_][A-Za-z0-9_]*\s*=/.test(trimmed)) {
                ir.push(`  STORE ${trimmed}`);
                return;
            }
            if (/^print\s*\(/.test(trimmed) || /^print\s+/.test(trimmed)) {
                ir.push(`  CALL ${trimmed}`);
                return;
            }
            if (/^if\s+/.test(trimmed)) {
                ir.push(`  BRANCH ${trimmed.replace(/:$/, '')}`);
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

            ir.push(`  EXEC ${trimmed}`);
        });

        return ir.join('\n');
    }

    fallbackOptimizedIR(ir) {
        const lines = ir.split('\n');
        if (lines.length) {
            lines[0] = `${lines[0]} [OPTIMIZED]`;
        }
        return lines.join('\n');
    }

    fallbackExecution(code, userInput = '') {
        const startTime = performance.now();
        const inputQueue = userInput.trim() ? userInput.trim().split(/\s+/) : [];
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

        lines.forEach((line, idx) => {
            if (!line.trim() || line.trim().startsWith('#')) return;
            parsed.push({
                lineNumber: idx + 1,
                indent: countIndent(line),
                text: line.trim()
            });
        });

        const env = {};
        const output = [];
        const maxLoopIterations = 10000;

        const nextInput = (lineNumber) => {
            if (inputQueue.length) return inputQueue.shift();
            pushWarning('Input requested but no input provided', lineNumber);
            return '';
        };

        const tokenizeExpression = (expr, lineNumber) => {
            const resolved = expr
                .replace(/int\s*\(\s*input\s*\(\s*\)\s*\)/g, () => `${parseFloat(nextInput(lineNumber) || '0')}`)
                .replace(/float\s*\(\s*input\s*\(\s*\)\s*\)/g, () => `${parseFloat(nextInput(lineNumber) || '0')}`)
                .replace(/input\s*\(\s*\)/g, () => `"${nextInput(lineNumber).replace(/"/g, '\\"')}"`);

            const tokens = [];
            const regex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+\b|\b[A-Za-z_][A-Za-z0-9_]*\b|==|!=|<=|>=|[()+\-*/])/g;
            let match;
            while ((match = regex.exec(resolved)) !== null) {
                tokens.push(match[0]);
            }
            return tokens;
        };

        const toValue = (token) => {
            if (/^\d+$/.test(token)) return parseFloat(token);
            if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
                return token.slice(1, -1);
            }
            return env[token] !== undefined ? env[token] : 0;
        };

        const evaluateTokens = (tokens, lineNumber) => {
            const outputQueue = [];
            const operators = [];
            const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };

            const pushOperator = (op) => {
                while (operators.length) {
                    const top = operators[operators.length - 1];
                    if (top === '(') break;
                    if ((precedence[top] || 0) >= (precedence[op] || 0)) {
                        outputQueue.push(operators.pop());
                    } else {
                        break;
                    }
                }
                operators.push(op);
            };

            tokens.forEach((token, idx) => {
                if (['+', '-', '*', '/'].includes(token)) {
                    const prev = tokens[idx - 1];
                    if (idx === 0 || ['+', '-', '*', '/', '('].includes(prev)) {
                        outputQueue.push('0');
                    }
                    pushOperator(token);
                } else if (token === '(') {
                    operators.push(token);
                } else if (token === ')') {
                    while (operators.length && operators[operators.length - 1] !== '(') {
                        outputQueue.push(operators.pop());
                    }
                    if (operators.length && operators[operators.length - 1] === '(') {
                        operators.pop();
                    }
                } else {
                    outputQueue.push(token);
                }
            });

            while (operators.length) {
                outputQueue.push(operators.pop());
            }

            const stack = [];
            outputQueue.forEach((token) => {
                if (['+', '-', '*', '/'].includes(token)) {
                    const right = stack.pop();
                    const left = stack.pop();
                    const leftVal = toValue(left);
                    const rightVal = toValue(right);

                    if ((typeof leftVal === 'string' || typeof rightVal === 'string') && token !== '+') {
                        stack.push('0');
                        return;
                    }

                    switch (token) {
                        case '+':
                            stack.push(typeof leftVal === 'string' || typeof rightVal === 'string'
                                ? `${leftVal}${rightVal}`
                                : leftVal + rightVal);
                            break;
                        case '-':
                            stack.push(leftVal - rightVal);
                            break;
                        case '*':
                            stack.push(leftVal * rightVal);
                            break;
                        case '/':
                            if (rightVal === 0) {
                                pushWarning('Division by zero', lineNumber);
                                stack.push(0);
                            } else {
                                stack.push(leftVal / rightVal);
                            }
                            break;
                    }
                } else {
                    stack.push(token);
                }
            });

            const resultToken = stack.pop();
            return toValue(resultToken !== undefined ? resultToken : '0');
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
            const match = expr.match(/(.+?)(==|!=|<=|>=|<|>)(.+)/);
            if (!match) {
                return Boolean(safeEvaluateExpression(expr, lineNumber));
            }
            const left = safeEvaluateExpression(match[1].trim(), lineNumber);
            const right = safeEvaluateExpression(match[3].trim(), lineNumber);
            switch (match[2]) {
                case '==': return left === right;
                case '!=': return left !== right;
                case '<=': return left <= right;
                case '>=': return left >= right;
                case '<': return left < right;
                case '>': return left > right;
                default: return false;
            }
        };

        const splitPrintArgs = (content) => {
            const args = [];
            let current = '';
            let inString = false;
            let stringChar = '';
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
                if (ch === ',' && !inString) {
                    args.push(current.trim());
                    current = '';
                } else {
                    current += ch;
                }
            }
            if (current.trim()) args.push(current.trim());
            return args;
        };

        const getBlockEnd = (startIndex, indentLevel) => {
            let i = startIndex;
            while (i < parsed.length) {
                const entry = parsed[i];
                if (entry.indent < indentLevel) return i;
                i += 1;
            }
            return i;
        };

        const executeLines = (startIndex, currentIndent) => {
            let i = startIndex;
            while (i < parsed.length) {
                const entry = parsed[i];
                if (entry.indent < currentIndent) return i;
                if (entry.indent > currentIndent) {
                    pushWarning('Unexpected indent', entry.lineNumber);
                    return i;
                }

                if (entry.indent % 4 !== 0) {
                    pushWarning('Indentation should use multiples of 4 spaces', entry.lineNumber);
                }

                const text = entry.text;

                if (/^if\s+/.test(text)) {
                    if (!/:$/.test(text)) {
                        pushWarning('Missing ":" after if statement', entry.lineNumber);
                        i += 1;
                        continue;
                    }
                    const condition = text.replace(/^if\s+/, '').replace(/:$/, '');
                    const bodyStart = i + 1;
                    const bodyEnd = getBlockEnd(bodyStart, currentIndent + 4);
                    let elseIndex = bodyEnd;
                    if (parsed[elseIndex] && parsed[elseIndex].indent === currentIndent && /^else\s*:/.test(parsed[elseIndex].text)) {
                        const elseStart = elseIndex + 1;
                        const elseEnd = getBlockEnd(elseStart, currentIndent + 4);
                        if (evaluateCondition(condition, entry.lineNumber)) {
                            executeLines(bodyStart, currentIndent + 4);
                        } else {
                            executeLines(elseStart, currentIndent + 4);
                        }
                        i = elseEnd;
                        continue;
                    }
                    if (evaluateCondition(condition, entry.lineNumber)) {
                        executeLines(bodyStart, currentIndent + 4);
                    }
                    i = bodyEnd;
                    continue;
                }

                if (/^for\s+/.test(text)) {
                    if (!/:$/.test(text)) {
                        pushWarning('Missing ":" after for statement', entry.lineNumber);
                        i += 1;
                        continue;
                    }
                    const match = text.match(/^for\s+(\w+)\s+in\s+range\s*\(([^)]*)\)\s*:/);
                    if (!match) {
                        pushWarning('Unsupported for-loop syntax', entry.lineNumber);
                        i += 1;
                        continue;
                    }
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
                    const bodyEnd = getBlockEnd(bodyStart, currentIndent + 4);
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

                if (/^while\s+/.test(text)) {
                    if (!/:$/.test(text)) {
                        pushWarning('Missing ":" after while statement', entry.lineNumber);
                        i += 1;
                        continue;
                    }
                    const condition = text.replace(/^while\s+/, '').replace(/:$/, '');
                    const bodyStart = i + 1;
                    const bodyEnd = getBlockEnd(bodyStart, currentIndent + 4);
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

                if (/^print\s*\(/.test(text)) {
                    const inside = text.replace(/^print\s*\(/, '').replace(/\)\s*$/, '');
                    const parts = splitPrintArgs(inside).map(part => safeEvaluateExpression(part, entry.lineNumber));
                    output.push(parts.join(' '));
                    i += 1;
                    continue;
                }

                if (/^print\s+/.test(text)) {
                    const value = text.replace(/^print\s+/, '');
                    output.push(safeEvaluateExpression(value, entry.lineNumber));
                    i += 1;
                    continue;
                }

                if (/^[A-Za-z_][A-Za-z0-9_]*\s*=/.test(text)) {
                    const [left, right] = text.split(/=(.+)/).map(part => part.trim());
                    env[left] = safeEvaluateExpression(right || '0', entry.lineNumber);
                    i += 1;
                    continue;
                }

                if (/^(def|class)\s+/.test(text)) {
                    pushWarning('Function/class definitions are not executed in fallback mode', entry.lineNumber);
                    i += 1;
                    continue;
                }

                pushWarning(`Unsupported statement: ${text}`, entry.lineNumber);
                i += 1;
            }
            return i;
        };

        try {
            executeLines(0, 0);
        } catch (error) {
            return {
                output: `Execution Error: ${error.message}`,
                timing: {
                    execution: performance.now() - startTime
                },
                warnings
            };
        }

        return {
            output: output.length ? output.join('\n') : '(No output)',
            timing: {
                execution: performance.now() - startTime
            },
            warnings
        };
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
            const executionTime = executionResult.timing?.execution || (performance.now() - startTime - lexerTime - astTime - irTime - optimizedTime);

            return {
                success: true,
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
                    execution: `Compilation Error: ${error.message}`
                }
            };
        }
    }
}

window.PythonCompiler = PythonCompiler;
