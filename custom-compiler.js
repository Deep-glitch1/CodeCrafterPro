// custom-compiler.js
// Complete Custom Language Compiler (from original CodeCrafter)

class CustomLanguageCompiler {
    constructor() {
        this.variables = {};
        this.output = [];
        this.error = null;
    }

    createCompilerError(message, line = 1, column = 1, type = 'Syntax') {
        const err = new Error(message);
        err.type = type;
        err.line = line;
        err.column = column;
        return err;
    }

    createBreakpointSignal(line = 1, column = 1) {
        const err = new Error(`Breakpoint hit at line ${line}, col ${column}`);
        err.type = 'Breakpoint';
        err.line = line;
        err.column = column;
        err.isBreakpoint = true;
        return err;
    }

    // Lexer
    lexer(input) {
        const tokens = [];
        let position = 0;
        let line = 1;
        let column = 1;

        const pushToken = (type, value, startLine, startColumn, endLine, endColumn) => {
            tokens.push({
                type,
                value,
                line: startLine,
                column: startColumn,
                endLine,
                endColumn
            });
        };

        const advance = (char) => {
            if (char === "\n") {
                line += 1;
                column = 1;
            } else {
                column += 1;
            }
            position += 1;
        };

        while (position < input.length) {
            let char = input[position];

            // Skip whitespace
            if (char === " " || char === "\t" || char === "\r") {
                advance(char);
                continue;
            }

            if (char === "\n") {
                advance(char);
                continue;
            }

            // Strings
            if (char === '"') {
                const startLine = line;
                const startColumn = column;
                advance(char);
                let text = "";
                while (position < input.length && input[position] !== '"') {
                    text += input[position];
                    advance(input[position]);
                }
                if (position >= input.length) {
                    throw this.createCompilerError(`Unterminated string literal (line ${startLine}, col ${startColumn})`, startLine, startColumn, 'Syntax');
                }
                advance(input[position]);
                pushToken("string", text, startLine, startColumn, line, Math.max(1, column - 1));
                continue;
            }

            // Keywords and Identifiers
            if (/[a-zA-Z]/.test(char)) {
                const startLine = line;
                const startColumn = column;
                let word = "";
                while (position < input.length && /[a-zA-Z]/.test(input[position])) {
                    word += input[position];
                    advance(input[position]);
                }

                if (["maano", "likho", "agar", "warna", "jabtak"].includes(word)) {
                    pushToken("keyword", word, startLine, startColumn, line, Math.max(1, column - 1));
                } else {
                    pushToken("identifier", word, startLine, startColumn, line, Math.max(1, column - 1));
                }
                continue;
            }

            // Numbers
            if (/[0-9]/.test(char)) {
                const startLine = line;
                const startColumn = column;
                let number = "";
                while (position < input.length && /[0-9]/.test(input[position])) {
                    number += input[position];
                    advance(input[position]);
                }
                pushToken("number", parseInt(number), startLine, startColumn, line, Math.max(1, column - 1));
                continue;
            }

            // Operators
            if (/[\+\-\*\/=<>!]/.test(char)) {
                const startLine = line;
                const startColumn = column;
                if (input[position + 1] === "=") {
                    const op = char + input[position + 1];
                    advance(char);
                    advance(input[position]);
                    pushToken("operator", op, startLine, startColumn, line, Math.max(1, column - 1));
                } else {
                    advance(char);
                    pushToken("operator", char, startLine, startColumn, line, Math.max(1, column - 1));
                }
                continue;
            }

            // Braces
            if (char === "{" || char === "}") {
                const startLine = line;
                const startColumn = column;
                advance(char);
                pushToken("brace", char, startLine, startColumn, line, Math.max(1, column - 1));
                continue;
            }

            throw this.createCompilerError(`Unexpected character '${char}' (line ${line}, col ${column})`, line, column, 'Syntax');
        }

        return tokens;
    }

    // Parser
    parser(tokens) {
        const ast = { type: "program", body: [] };
        let lastToken = null;

        const makeSyntaxError = (message, token = lastToken) => {
            const line = token?.line || 1;
            const column = token?.column || 1;
            return this.createCompilerError(`${message} (line ${line}, col ${column})`, line, column, 'Syntax');
        };

        const shiftToken = () => {
            const token = tokens.shift();
            if (token) lastToken = token;
            return token;
        };

        const expectToken = (type, value = null) => {
            const token = shiftToken();
            if (!token) {
                throw makeSyntaxError(`Unexpected end of input, expected ${type}${value ? ` '${value}'` : ''}`);
            }
            if (token.type !== type || (value !== null && token.value !== value)) {
                throw makeSyntaxError(`Unexpected token '${token.value}', expected ${type}${value ? ` '${value}'` : ''}`, token);
            }
            return token;
        };

        const expectOneOf = (types) => {
            const token = shiftToken();
            if (!token) {
                throw makeSyntaxError(`Unexpected end of input, expected ${types.join(' or ')}`);
            }
            if (!types.includes(token.type)) {
                throw makeSyntaxError(`Unexpected token '${token.value}', expected ${types.join(' or ')}`, token);
            }
            return token;
        };

        const parseExpression = () => {
            let expression = "";
            while (tokens.length > 0) {
                const token = tokens[0];
                if (
                    token.type === "operator" ||
                    token.type === "identifier" ||
                    token.type === "number"
                ) {
                    expression += token.value + " ";
                    shiftToken();
                } else {
                    break;
                }
            }
            return expression.trim();
        };

        const parseBlock = () => {
            const body = [];
            while (tokens.length > 0 && tokens[0].type !== "brace") {
                const statement = parseStatement();
                if (statement) body.push(statement);
            }
            const closing = shiftToken();
            if (!closing || closing.type !== "brace" || closing.value !== "}") {
                throw makeSyntaxError("Missing closing brace '}'", closing);
            }
            return body;
        };

        const parseStatement = () => {
            const token = shiftToken();

            if (!token) return null;

            // Variable Declaration
            if (token.type === "keyword" && token.value === "maano") {
                const identifier = expectToken("identifier");
                expectToken("operator", "=");
                const value = parseExpression();
                if (!value) {
                    throw makeSyntaxError("Expected expression after '='", identifier);
                }
                return {
                    type: "declaration",
                    name: identifier.value,
                    value: value,
                    loc: { line: token.line, column: token.column }
                };
            }

            // Print Statement
            if (token.type === "keyword" && token.value === "likho") {
                if (tokens[0] && tokens[0].type === "string") {
                    const value = shiftToken();
                    return {
                        type: "print",
                        isString: true,
                        value: value.value,
                        loc: { line: token.line, column: token.column }
                    };
                } else {
                    const value = parseExpression();
                    if (!value) {
                        throw makeSyntaxError("Expected expression after 'likho'", token);
                    }
                    return {
                        type: "print",
                        isString: false,
                        value: value,
                        loc: { line: token.line, column: token.column }
                    };
                }
            }

            // If-Else Statement
            if (token.type === "keyword" && token.value === "agar") {
                const conditionLeft = expectOneOf(["identifier", "number"]);
                const conditionOperator = expectToken("operator");
                const conditionRight = expectOneOf(["identifier", "number"]);

                expectToken("brace", "{");
                const body = parseBlock();

                let elseBody = [];
                if (tokens.length > 0 && tokens[0].value === "warna") {
                    shiftToken();
                    expectToken("brace", "{");
                    elseBody = parseBlock();
                }

                return {
                    type: "conditional",
                    condition: {
                        left: conditionLeft,
                        operator: conditionOperator.value,
                        right: conditionRight,
                    },
                    body,
                    elseBody,
                    loc: { line: token.line, column: token.column }
                };
            }

            // While Loop
            if (token.type === "keyword" && token.value === "jabtak") {
                const conditionLeft = expectOneOf(["identifier", "number"]);
                const conditionOperator = expectToken("operator");
                const conditionRight = expectOneOf(["identifier", "number"]);

                expectToken("brace", "{");
                const body = parseBlock();

                return {
                    type: "loop",
                    condition: {
                        left: conditionLeft,
                        operator: conditionOperator.value,
                        right: conditionRight,
                    },
                    body,
                    loc: { line: token.line, column: token.column }
                };
            }

            throw makeSyntaxError(`Unexpected token '${token.value}'`, token);
        };

        while (tokens.length > 0) {
            const statement = parseStatement();
            if (statement) ast.body.push(statement);
        }

        return ast;
    }

    // Interpreter
    interpret(ast, options = {}) {
        this.variables = {};
        this.output = [];
        const breakpoints = options.breakpoints || new Set();
        const executionStack = [];

        const raiseRuntimeError = (message, loc) => {
            const line = loc?.line || 1;
            const column = loc?.column || 1;
            const err = this.createCompilerError(`${message} (line ${line}, col ${column})`, line, column, 'Runtime');
            err.isRuntime = true;
            throw err;
        };

        const evaluateExpression = (expr) => {
            if (typeof expr === "number") {
                return expr;
            }

            if (typeof expr === "string") {
                if (expr.includes("+") || expr.includes("-") || expr.includes("*") || expr.includes("/")) {
                    const tokens = expr.split(/(\+|\-|\*|\/)/).map(t => t.trim());
                    let result = evaluateToken(tokens[0]);

                    for (let i = 1; i < tokens.length; i += 2) {
                        const operator = tokens[i];
                        const operand = evaluateToken(tokens[i + 1]);

                        switch (operator) {
                            case "+":
                                result += operand;
                                break;
                            case "-":
                                result -= operand;
                                break;
                            case "*":
                                result *= operand;
                                break;
                            case "/":
                                if (operand === 0) {
                                    raiseRuntimeError("Division by zero", currentStatement?.loc);
                                }
                                result /= operand;
                                break;
                        }
                    }
                    return result;
                } else {
                    return evaluateToken(expr);
                }
            }

            return expr;
        };

        const evaluateToken = (token) => {
            if (!isNaN(token)) {
                return parseFloat(token);
            }
            if (this.variables.hasOwnProperty(token)) {
                return this.variables[token];
            }
            raiseRuntimeError(`Undefined variable '${token}'`, currentStatement?.loc);
        };

        let currentStatement = null;

        const withStack = (statement, fn) => {
            const loc = statement?.loc || { line: 1, column: 1 };
            executionStack.push({ type: statement?.type || 'unknown', line: loc.line, column: loc.column });
            try {
                return fn();
            } catch (err) {
                if (!err.stackTrace) {
                    err.stackTrace = [...executionStack];
                }
                throw err;
            } finally {
                executionStack.pop();
            }
        };

        const executeStatement = (statement) => {
            if (statement?.loc && breakpoints.has(statement.loc.line)) {
                throw this.createBreakpointSignal(statement.loc.line, statement.loc.column);
            }

            return withStack(statement, () => {
                currentStatement = statement;
            switch (statement.type) {
                case "declaration":
                    this.variables[statement.name] = evaluateExpression(statement.value);
                    break;
                case "print":
                    if (statement.isString) {
                        this.output.push(statement.value);
                    } else {
                        const result = evaluateExpression(statement.value);
                        this.output.push(result.toString());
                    }
                    break;
                case "conditional":
                    const left = evaluateToken(statement.condition.left.value);
                    const right = evaluateToken(statement.condition.right.value);
                    let conditionMet = false;

                    switch (statement.condition.operator) {
                        case "<":
                            conditionMet = left < right;
                            break;
                        case ">":
                            conditionMet = left > right;
                            break;
                        case "<=":
                            conditionMet = left <= right;
                            break;
                        case ">=":
                            conditionMet = left >= right;
                            break;
                        case "==":
                            conditionMet = left == right;
                            break;
                        case "!=":
                            conditionMet = left != right;
                            break;
                    }

                    if (conditionMet) {
                        statement.body.forEach(executeStatement);
                    } else if (statement.elseBody.length > 0) {
                        statement.elseBody.forEach(executeStatement);
                    }
                    break;
                case "loop":
                    let loopCount = 0;
                    const maxIterations = 1000;

                    while (loopCount < maxIterations) {
                        const loopLeft = evaluateToken(statement.condition.left.value);
                        const loopRight = evaluateToken(statement.condition.right.value);
                        let loopConditionMet = false;

                        switch (statement.condition.operator) {
                            case "<":
                                loopConditionMet = loopLeft < loopRight;
                                break;
                            case ">":
                                loopConditionMet = loopLeft > loopRight;
                                break;
                            case "<=":
                                loopConditionMet = loopLeft <= loopRight;
                                break;
                            case ">=":
                                loopConditionMet = loopLeft >= loopRight;
                                break;
                            case "==":
                                loopConditionMet = loopLeft == loopRight;
                                break;
                            case "!=":
                                loopConditionMet = loopLeft != loopRight;
                                break;
                        }

                        if (!loopConditionMet) break;

                        statement.body.forEach(executeStatement);
                        loopCount++;
                    }
                    break;
            }
            return null;
            });
        };

        ast.body.forEach(executeStatement);
        return this.output.join("\n");
    }

    lint(tokens, ast) {
        const warnings = [];
        const declared = new Map();
        const used = new Map();

        const markUsedInExpression = (expr, loc) => {
            if (!expr || typeof expr !== 'string') return;
            const identifiers = expr.match(/[a-zA-Z]+/g) || [];
            identifiers.forEach((id) => {
                if (["maano", "likho", "agar", "warna", "jabtak"].includes(id)) return;
                used.set(id, loc || { line: 1, column: 1 });
            });
        };

        const walk = (node) => {
            if (!node) return;
            switch (node.type) {
                case 'declaration':
                    declared.set(node.name, node.loc || { line: 1, column: 1 });
                    markUsedInExpression(node.value, node.loc);
                    break;
                case 'print':
                    if (!node.isString) {
                        markUsedInExpression(node.value, node.loc);
                    }
                    break;
                case 'conditional':
                    markUsedInExpression(node.condition.left.value, node.loc);
                    markUsedInExpression(node.condition.right.value, node.loc);
                    node.body.forEach(walk);
                    node.elseBody.forEach(walk);
                    break;
                case 'loop':
                    markUsedInExpression(node.condition.left.value, node.loc);
                    markUsedInExpression(node.condition.right.value, node.loc);
                    node.body.forEach(walk);

                    const loopVar = node.condition.left.value;
                    const loopHasUpdate = node.body.some(child => child.type === 'declaration' && child.name === loopVar);
                    if (!loopHasUpdate) {
                        warnings.push({
                            message: `Loop variable '${loopVar}' is never updated inside the loop (possible infinite loop).`,
                            line: node.loc?.line || 1,
                            column: node.loc?.column || 1,
                            severity: 'warning'
                        });
                    }
                    break;
            }
        };

        ast.body.forEach(walk);

        declared.forEach((loc, name) => {
            if (!used.has(name)) {
                warnings.push({
                    message: `Variable '${name}' is declared but never used.`,
                    line: loc.line,
                    column: loc.column,
                    severity: 'warning'
                });
            }
        });

        used.forEach((loc, name) => {
            if (!declared.has(name)) {
                warnings.push({
                    message: `Variable '${name}' is used before declaration.`,
                    line: loc.line,
                    column: loc.column,
                    severity: 'warning'
                });
            }
        });

        return warnings;
    }

    // Public API
    compile(code, options = {}) {
        try {
            const startTime = performance.now();
            
            // Lexical Analysis
            const tokens = this.lexer(code);
            const lexerTime = performance.now() - startTime;
            
            // Syntax Analysis
            const ast = this.parser([...tokens]);
            const parserTime = performance.now() - startTime - lexerTime;
            
            // Interpretation
            const output = this.interpret(ast, { breakpoints: options.breakpoints || new Set() });
            const interpretTime = performance.now() - startTime - lexerTime - parserTime;

            const warnings = this.lint(tokens, ast);
            
            return {
                success: true,
                tokens: tokens,
                ast: ast,
                output: output,
                warnings: warnings,
                timing: {
                    lexer: lexerTime,
                    parser: parserTime,
                    interpret: interpretTime,
                    total: performance.now() - startTime
                }
            };
        } catch (error) {
            if (error.isBreakpoint) {
                return {
                    success: false,
                    paused: true,
                    breakpoint: { line: error.line || 1, column: error.column || 1 },
                    error: error.message
                };
            }
            return {
                success: false,
                error: error.message,
                errorDetails: {
                    line: error.line || 1,
                    column: error.column || 1,
                    type: error.type || 'Error',
                    stackTrace: error.stackTrace || null
                },
                output: `Compilation Error: ${error.message}`
            };
        }
    }

    // Format output for display
    formatTokens(tokens) {
        return tokens.map((token, i) => 
            `${i + 1}. ${token.type.toUpperCase()}: "${token.value}"`
        ).join('\n');
    }

    formatAST(ast, indent = 0) {
        const spaces = '  '.repeat(indent);
        let result = `${spaces}${ast.type}`;
        
        if (ast.value !== undefined) {
            result += ` (${ast.value})`;
        }
        
        if (ast.name) {
            result += ` [name: ${ast.name}]`;
        }
        
        result += '\n';
        
        if (ast.body) {
            ast.body.forEach(child => {
                result += this.formatAST(child, indent + 1);
            });
        }
        
        if (ast.children) {
            ast.children.forEach(child => {
                result += this.formatAST(child, indent + 1);
            });
        }
        
        return result;
    }
}

// Export for global use
window.CustomLanguageCompiler = CustomLanguageCompiler;