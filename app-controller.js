// app-controller.js
// Application controller (extracted from main.js)

class CodeCrafterApp {
    constructor() {
        this.currentMode = 'c';
        this.customCompiler = null;
        this.cCompiler = null;
        this.pythonCompiler = null;
        this.aiAssistant = null;
        this.keywordConfig = this.getDefaultKeywordConfig();
        this.editorManager = new window.EditorManager({
            markerOwner: 'codecrafter',
            getCurrentMode: () => this.currentMode
        });
        this.outputManager = new window.OutputManager();
        this.statsManager = new window.StatsManager();
        this.samplePrograms = {
            c: {
                factorial: `#include <stdio.h>

int main() {
    int n = 5;
    int fact = 1;
    for (int i = 1; i <= n; i++) {
        fact *= i;
    }
    printf("Factorial of %d is %d\\n", n, fact);
    return 0;
}`,
                fibonacci: `#include <stdio.h>

int main() {
    int n = 10;
    int a = 0, b = 1, c;
    printf("Fibonacci: ");
    for (int i = 0; i < n; i++) {
        printf("%d ", a);
        c = a + b;
        a = b;
        b = c;
    }
    return 0;
}`,
                io: `#include <stdio.h>

int main() {
    char name[50];
    int age;
    printf("Enter name: ");
    scanf("%49s", name);
    printf("Enter age: ");
    scanf("%d", &age);
    printf("Hello %s, you are %d years old.\\n", name, age);
    return 0;
}`
            },
            python: {
                factorial: `n = 5
fact = 1

for i in range(1, n + 1):
    fact = fact * i

print("Factorial:", fact)`,
                fibonacci: `count = 8
a = 0
b = 1

print("Fibonacci:")
for i in range(count):
    print(a)
    temp = a + b
    a = b
    b = temp`,
                io: `name = input()
age = int(input())

print("Hello", name)
print("Age", age)`
            },
            custom: {
                factorial: `maano n = 5
maano fact = 1
maano i = 1

jabtak i <= n {
    maano fact = fact * i
    maano i = i + 1
}

likho "Factorial of " + n + " is " + fact`,
                fibonacci: `maano count = 10
maano a = 0
maano b = 1
maano i = 0

likho "Fibonacci:"
jabtak i < count {
    likho a
    maano temp = a + b
    maano a = b
    maano b = temp
    maano i = i + 1
}`,
                io: `likho "Welcome!"
maano name = "Coder"
maano age = 21
likho "Hello " + name + ", age " + age
agar age >= 18 {
    likho "Adult"
} warna {
    likho "Minor"
}`
            }
        };
        this.initialize();
    }

    async initialize() {
        // Initialize Monaco Editor
        await this.editorManager.initializeEditors();

        // Initialize compilers
        this.customCompiler = new CustomLanguageCompiler();
        this.customCompiler.setKeywords(this.keywordConfig);
        this.cCompiler = new CCompiler();
        this.pythonCompiler = new PythonCompiler();

        // Initialize AI Assistant
        this.aiAssistant = new AIAssistant();
        window.aiAssistant = this.aiAssistant;

        // Set initial mode
        this.changeCompilerMode('c');
        this.setupKeywordConfigUI();

        console.log("✅ CodeCrafter Pro initialized");
    }

    getDefaultKeywordConfig() {
        if (typeof CONFIG !== 'undefined' && CONFIG.CUSTOM_KEYWORDS) {
            return { ...CONFIG.CUSTOM_KEYWORDS };
        }
        return {
            declare: 'maano',
            print: 'likho',
            if: 'agar',
            else: 'warna',
            while: 'jabtak'
        };
    }

    formatStackTrace(stackTrace) {
        if (!Array.isArray(stackTrace) || stackTrace.length === 0) return '';
        return stackTrace.map((frame, idx) => `#${idx + 1} ${frame.type} at line ${frame.line}, col ${frame.column}`).join('\n');
    }

    scanCBrackets(code) {
        const stack = [];
        const pairs = { '{': '}', '(': ')', '[': ']' };
        const closers = new Set(['}', ')', ']']);
        let line = 1;
        let column = 1;

        const advance = (ch) => {
            if (ch === '\n') {
                line += 1;
                column = 1;
            } else {
                column += 1;
            }
        };

        for (let i = 0; i < code.length; i += 1) {
            const ch = code[i];
            if (pairs[ch]) {
                stack.push({ char: ch, line, column });
            } else if (closers.has(ch)) {
                const last = stack.pop();
                if (!last || pairs[last.char] !== ch) {
                    return {
                        message: `Unmatched '${ch}'`,
                        line,
                        column,
                        severity: 'error'
                    };
                }
            }
            advance(ch);
        }

        if (stack.length > 0) {
            const last = stack.pop();
            return {
                message: `Missing closing '${pairs[last.char]}'`,
                line: last.line,
                column: last.column,
                severity: 'error'
            };
        }

        return null;
    }

    lintCCode(code) {
        const warnings = [];
        const usesPrintf = /\bprintf\s*\(/.test(code);
        const usesScanf = /\bscanf\s*\(/.test(code);
        const hasStdIo = /#include\s*<stdio\.h>/.test(code);
        if ((usesPrintf || usesScanf) && !hasStdIo) {
            warnings.push({
                message: 'Missing #include <stdio.h> for printf/scanf usage.',
                line: 1,
                column: 1,
                severity: 'warning'
            });
        }
        if (!/\breturn\s+0\s*;/.test(code)) {
            warnings.push({
                message: 'main() should return 0 on success.',
                line: 1,
                column: 1,
                severity: 'warning'
            });
        }
        return warnings;
    }

    changeCompilerMode(mode = null) {
        if (!mode) {
            mode = document.getElementById('compilerMode').value;
        }

        this.currentMode = mode;

        const singleContainer = document.getElementById('singleEditorContainer');
        const dualContainer = document.getElementById('dualEditorContainer');
        const inputSection = document.getElementById('inputSection');
        const keywordPanel = document.getElementById('keywordConfigPanel');
        const inputLabel = document.getElementById('inputLabel');
        const wasmBadge = document.getElementById('wasmStatusBadge');

        // Update UI based on mode
        switch (mode) {
            case 'c':
                singleContainer.classList.remove('hidden');
                if (dualContainer) dualContainer.classList.add('hidden');
                inputSection.classList.remove('hidden');
                if (keywordPanel) keywordPanel.classList.add('hidden');
                this.updateEditorUI('C/C++ Compiler', 'Write C or C++ code');
                if (inputLabel) inputLabel.textContent = 'Input for scanf:';
                if (wasmBadge) wasmBadge.classList.remove('hidden');
                break;

            case 'python':
                singleContainer.classList.remove('hidden');
                if (dualContainer) dualContainer.classList.add('hidden');
                inputSection.classList.remove('hidden');
                if (keywordPanel) keywordPanel.classList.add('hidden');
                this.updateEditorUI('Python Compiler', 'Write Python code');
                if (inputLabel) inputLabel.textContent = 'Program input (optional):';
                if (wasmBadge) wasmBadge.classList.add('hidden');
                break;

            case 'custom':
                singleContainer.classList.remove('hidden');
                if (dualContainer) dualContainer.classList.add('hidden');
                inputSection.classList.add('hidden');
                if (keywordPanel) keywordPanel.classList.remove('hidden');
                this.updateEditorUI('Custom Language', 'Use maano, likho, agar, warna, jabtak');
                if (wasmBadge) wasmBadge.classList.add('hidden');
                break;
        }

            this.editorManager.setMode(mode);

        // Clear outputs
        this.outputManager.clearOutputs();
        this.statsManager.reset();
    }

    setupKeywordConfigUI() {
        const config = this.keywordConfig;
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        };

        setValue('kwDeclareInput', config.declare);
        setValue('kwPrintInput', config.print);
        setValue('kwIfInput', config.if);
        setValue('kwElseInput', config.else);
        setValue('kwWhileInput', config.while);

        this.updateKeywordHints(config);
    }

    readKeywordInputs() {
        const read = (id) => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : '';
        };
        return {
            declare: read('kwDeclareInput'),
            print: read('kwPrintInput'),
            if: read('kwIfInput'),
            else: read('kwElseInput'),
            while: read('kwWhileInput')
        };
    }

    normalizeKeywordConfig(config) {
        return {
            declare: (config.declare || '').trim().toLowerCase(),
            print: (config.print || '').trim().toLowerCase(),
            if: (config.if || '').trim().toLowerCase(),
            else: (config.else || '').trim().toLowerCase(),
            while: (config.while || '').trim().toLowerCase()
        };
    }

    validateKeywordConfig(config) {
        const values = Object.values(config);
        const invalid = values.find(value => !/^[a-zA-Z]+$/.test(value));
        if (invalid) {
            return { valid: false, message: 'Keywords must use letters only (A-Z).' };
        }
        const set = new Set(values);
        if (set.size !== values.length) {
            return { valid: false, message: 'Keywords must be unique.' };
        }
        return { valid: true };
    }

    updateKeywordHints(config) {
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };
        setText('kwDeclareHint', config.declare);
        setText('kwPrintHint', config.print);
        setText('kwIfHint', config.if);
        setText('kwElseHint', config.else);
        setText('kwWhileHint', config.while);
    }

    applyKeywordConfig() {
        const raw = this.readKeywordInputs();
        const normalized = this.normalizeKeywordConfig(raw);
        const validation = this.validateKeywordConfig(normalized);
        if (!validation.valid) {
            this.outputManager.showToast(validation.message, 'error');
            return;
        }

        this.keywordConfig = normalized;
        this.customCompiler.setKeywords(this.keywordConfig);
        this.updateKeywordHints(this.keywordConfig);
        this.outputManager.showToast('Custom keywords applied for this session.', 'success');
    }

    updateEditorUI(title, subtitle) {
        document.getElementById('editorTitle').textContent = title;
        document.getElementById('editorSubtitle').textContent = subtitle;
    }

    async compileAndRun() {
        const startTime = performance.now();

        try {
            switch (this.currentMode) {
                case 'c':
                    await this.compileC();
                    break;
                case 'python':
                    await this.compilePython();
                    break;
                case 'custom':
                    this.compileCustom();
                    break;
            }

            this.statsManager.setTotal(performance.now() - startTime);

        } catch (error) {
            this.showError('Compilation failed', error.message);
        }
    }

    debugRun() {
        if (this.currentMode === 'custom') {
            return this.compileCustom({ breakpoints: this.editorManager.getBreakpoints('main') });
        }

        this.outputManager.showToast('Breakpoint debugging is available for the custom language only.', 'warning');
        return null;
    }

    async compileC() {
        const code = this.editorManager.getEditorValue('main');
        const userInput = document.getElementById('userInput').value;

        this.editorManager.clearDiagnostics('main');
        const bracketError = this.scanCBrackets(code);
        if (bracketError) {
            this.editorManager.applyDiagnostics('main', [bracketError]);
            this.outputManager.showError('C Syntax Error', bracketError.message);
            return;
        }

        const result = await this.cCompiler.compile(code, userInput);

        if (result.success) {
            // Update outputs
            document.getElementById('lexerOutput').textContent = result.outputs.lexer;
            document.getElementById('astOutput').textContent = result.outputs.ast;
            document.getElementById('irOutput').textContent = result.outputs.ir;
            document.getElementById('optimizedIrOutput').textContent = result.outputs.optimizedIR;
            document.getElementById('executionOutput').textContent = result.outputs.execution;

            const warnings = this.lintCCode(code);
            if (warnings.length) {
                this.editorManager.applyDiagnostics('main', warnings);
                document.getElementById('executionOutput').textContent +=
                    `\n\n⚠️ Lint Warnings:\n${warnings.map(w => `• ${w.message}`).join('\n')}`;
            }

            // Update stats
            this.statsManager.updateTimings({
                lexerTime: result.timing.lexer,
                astTime: result.timing.ast,
                irTime: result.timing.ir
            });

            // Show execution tab
            showOutputTab('executionOutput');

            // Add WASM status indicator
            const wasmStatus = result.wasm ? "✅ (WASM)" : "⚠️ (Fallback)";
            document.getElementById('executionOutput').textContent +=
                `\n\nCompiler Mode: ${wasmStatus}`;
            this.outputManager.updateWasmBadge(result.wasm);

        } else {
            this.outputManager.showError('C Compilation Error', result.error);
        }
    }

    async compilePython() {
        const code = this.editorManager.getEditorValue('main');
        const userInput = document.getElementById('userInput').value;

        this.editorManager.clearDiagnostics('main');

        const result = await this.pythonCompiler.compile(code, userInput);

        if (result.success) {
            document.getElementById('lexerOutput').textContent = result.outputs.lexer;
            document.getElementById('astOutput').textContent = result.outputs.ast;
            document.getElementById('irOutput').textContent = result.outputs.ir;
            document.getElementById('optimizedIrOutput').textContent = result.outputs.optimizedIR;
            document.getElementById('executionOutput').textContent = result.outputs.execution;

            if (result.warnings && result.warnings.length) {
                this.editorManager.applyDiagnostics('main', result.warnings);
                document.getElementById('executionOutput').textContent +=
                    `\n\n⚠️ Runtime Warnings:\n${result.warnings.map(w => `• ${w.message}`).join('\n')}`;
            }

            this.statsManager.updateTimings({
                lexerTime: result.timing.lexer,
                astTime: result.timing.ast,
                irTime: result.timing.ir
            });

            showOutputTab('executionOutput');
        } else {
            this.outputManager.showError('Python Compilation Error', result.error);
        }
    }

    compileCustom(options = {}) {
        const code = this.editorManager.getEditorValue('main');
        return this.runCustomCompilation(code, 'main', options);
    }

    runCustomCompilation(code, editorKey, options = {}) {
        this.editorManager.clearDiagnostics(editorKey);

        const validation = this.validateCustomCode(code);
        if (!validation.valid) {
            if (validation.line && validation.column) {
                this.editorManager.applyDiagnostics(editorKey, [{
                    message: validation.message,
                    line: validation.line,
                    column: validation.column,
                    severity: 'error'
                }]);
            }
            this.outputManager.showError('Custom Language Error', validation.message);
            this.outputManager.showToast(validation.message, 'error');
            return { success: false };
        }

        const result = this.customCompiler.compile(code, { breakpoints: options.breakpoints || new Set() });

        if (result.paused) {
            const bp = result.breakpoint || { line: 1, column: 1 };
            this.outputManager.showError('Breakpoint', `Execution paused at line ${bp.line}, col ${bp.column}.`);
            const editor = this.editorManager.getEditor(editorKey);
            editor?.revealLineInCenter(bp.line);
            editor?.setPosition({ lineNumber: bp.line, column: bp.column });
            showOutputTab('executionOutput');
            return result;
        }

        if (result.success) {
            // Update outputs
            document.getElementById('lexerOutput').textContent = this.customCompiler.formatTokens(result.tokens);
            document.getElementById('astOutput').textContent = this.customCompiler.formatAST(result.ast);
            document.getElementById('irOutput').textContent = result.ir
                ? this.customCompiler.formatIR(result.ir)
                : "Custom Language IR (JavaScript execution)";
            document.getElementById('optimizedIrOutput').textContent = "Optimization applied during interpretation";
            document.getElementById('executionOutput').textContent = result.output;

            if (result.warnings && result.warnings.length) {
                this.editorManager.applyDiagnostics(editorKey, result.warnings);
                document.getElementById('executionOutput').textContent +=
                    `\n\n⚠️ Lint Warnings:\n${result.warnings.map(w => `• ${w.message}`).join('\n')}`;
            }

            // Update stats
            this.statsManager.updateTimings({
                lexerTime: result.timing.lexer,
                astTime: result.timing.parser,
                irTime: result.timing.ir || result.timing.interpret
            });

            // Show execution tab
            showOutputTab('executionOutput');
            return result;

        } else {
            const details = result.errorDetails;
            if (details?.line && details?.column) {
                this.editorManager.applyDiagnostics(editorKey, [{
                    message: result.error,
                    line: details.line,
                    column: details.column,
                    severity: 'error'
                }]);
            }
            const stackTrace = details?.stackTrace ? this.formatStackTrace(details.stackTrace) : '';
            this.outputManager.showError('Custom Language Error', result.error, stackTrace);
            this.outputManager.showToast(result.error, 'error');
            return result;
        }
    }


    async runCompilerStage(stage) {
        const code = this.editorManager.currentEditor?.getValue();
        if (!code) return;

        try {
            let output;

            switch (stage) {
                case 'lexer':
                    if (this.currentMode === 'c') {
                        output = this.cCompiler.runLexer(code);
                    } else if (this.currentMode === 'python') {
                        output = this.pythonCompiler.runLexer(code);
                    } else {
                        const tokens = this.customCompiler.lexer(code);
                        output = this.customCompiler.formatTokens(tokens);
                    }
                    document.getElementById('lexerOutput').textContent = output;
                    showOutputTab('lexerOutput');
                    break;

                case 'ast':
                    if (this.currentMode === 'c') {
                        output = this.cCompiler.runAST(code);
                    } else if (this.currentMode === 'python') {
                        output = this.pythonCompiler.runAST(code);
                    } else {
                        const tokens = this.customCompiler.lexer(code);
                        const ast = this.customCompiler.parser([...tokens]);
                        output = this.customCompiler.formatAST(ast);
                    }
                    document.getElementById('astOutput').textContent = output;
                    showOutputTab('astOutput');
                    break;

                case 'ir':
                    if (this.currentMode === 'c') {
                        output = this.cCompiler.runIR(code);
                    } else if (this.currentMode === 'python') {
                        output = this.pythonCompiler.runIR(code);
                    } else {
                        const irResult = this.customCompiler.compile(code);
                        output = irResult.success && irResult.ir
                            ? this.customCompiler.formatIR(irResult.ir)
                            : "Custom Language Intermediate Representation:\n" +
                              "(IR generation failed)";
                    }
                    document.getElementById('irOutput').textContent = output;
                    showOutputTab('irOutput');
                    break;

                case 'codegen':
                    if (this.currentMode === 'c') {
                        const ir = this.cCompiler.runIR(code);
                        const optimized = this.cCompiler.runOptimizedIR(ir);
                        output = this.cCompiler.runCodegen(optimized);
                    } else if (this.currentMode === 'python') {
                        const pythonResult = await this.pythonCompiler.compile(code, document.getElementById('userInput').value);
                        output = pythonResult.success ? pythonResult.outputs.execution : pythonResult.error;
                    } else {
                        const compileResult = this.customCompiler.compile(code);
                        output = compileResult.success ? compileResult.output : compileResult.error;
                    }
                    document.getElementById('executionOutput').textContent = output;
                    showOutputTab('executionOutput');
                    break;
            }

        } catch (error) {
            this.outputManager.showError(`${stage} Error`, error.message);
            this.outputManager.showToast(`${stage.toUpperCase()} failed: ${error.message}`, 'error');
        }
    }

    validateCustomCode(code) {
        try {
            const tokens = this.customCompiler.lexer(code);
            const stack = [];
            tokens.forEach(token => {
                const isBrace = token.type === 'brace' || (token.type === 'PUNCTUATION' && (token.value === '{' || token.value === '}'));
                if (isBrace) {
                    if (token.value === '{') {
                        stack.push(token);
                    } else {
                        const last = stack.pop();
                        if (!last) {
                            throw { message: "Unmatched '}'", line: token.line, column: token.column };
                        }
                    }
                }
            });
            if (stack.length > 0) {
                const last = stack.pop();
                return {
                    valid: false,
                    message: "Missing closing '}'",
                    line: last.line,
                    column: last.column
                };
            }
            if (tokens.length === 0) {
                return { valid: false, message: 'Custom code is empty after lexing.' };
            }
            return { valid: true };
        } catch (error) {
            return {
                valid: false,
                message: error.message || 'Syntax error in custom code.',
                line: error.line || 1,
                column: error.column || 1
            };
        }
    }

    updateWasmBadge(isWasm) {
        this.outputManager.updateWasmBadge(isWasm);
    }

    loadSample(sampleKey) {
        if (!sampleKey) return;
        if (this.currentMode === 'c') {
            const cSample = this.samplePrograms.c[sampleKey] || CONFIG.COMPILERS.C.defaultCode;
            this.editorManager.setEditorValue('main', cSample);
        } else if (this.currentMode === 'python') {
            const pythonSample = this.samplePrograms.python[sampleKey] || CONFIG.COMPILERS.PYTHON.defaultCode;
            this.editorManager.setEditorValue('main', pythonSample);
        } else if (this.currentMode === 'custom') {
            const customSample = this.samplePrograms.custom[sampleKey] || CONFIG.COMPILERS.CUSTOM.defaultCode;
            this.editorManager.setEditorValue('main', customSample);
        }
    }

    saveInputPreset() {
        const presetName = prompt('Name this input preset');
        if (!presetName) return;
        const userInput = document.getElementById('userInput').value;
        const cInputEl = document.getElementById('cUserInput');
        const cInput = cInputEl ? cInputEl.value : '';
        const presets = this.getInputPresets();
        presets[presetName] = { userInput, cInput };
        this.persistInputPresets(presets);
        this.refreshPresetDropdown();
        this.outputManager.showToast('Preset saved', 'success');
    }

    applyInputPreset() {
        const select = document.getElementById('inputPresetSelect');
        const key = select?.value;
        if (!key) return;
        const presets = this.getInputPresets();
        const preset = presets[key];
        if (!preset) return;
        document.getElementById('userInput').value = preset.userInput || '';
        const cInputEl = document.getElementById('cUserInput');
        if (cInputEl) cInputEl.value = preset.cInput || '';
        this.outputManager.showToast(`Applied preset: ${key}`, 'info');
    }

    deleteInputPreset() {
        const select = document.getElementById('inputPresetSelect');
        const key = select?.value;
        if (!key) return;
        const presets = this.getInputPresets();
        delete presets[key];
        this.persistInputPresets(presets);
        this.refreshPresetDropdown();
        this.outputManager.showToast('Preset removed', 'warning');
    }

    refreshPresetDropdown() {
        const select = document.getElementById('inputPresetSelect');
        if (!select) return;
        const presets = this.getInputPresets();
        select.innerHTML = '<option value="">Input presets...</option>';
        Object.keys(presets).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            select.appendChild(opt);
        });
    }

    getInputPresets() {
        try {
            return JSON.parse(localStorage.getItem('codecrafter_input_presets') || '{}');
        } catch (err) {
            return {};
        }
    }

    persistInputPresets(presets) {
        try {
            localStorage.setItem('codecrafter_input_presets', JSON.stringify(presets));
        } catch (err) {
            console.warn('Unable to persist presets', err);
        }
    }
}

window.CodeCrafterApp = CodeCrafterApp;
