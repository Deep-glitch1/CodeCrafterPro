// translation-ui-manager.js
/**
 * TranslationUIManager - Manages UI for translator and comparison features
 * Opens as a separate full-page modal
 */

class TranslationUIManager {
    constructor() {
        this.translator = new CodeTranslator();
        this.comparisonManager = new ComparisonManager();
        this.currentTranslation = null;
        this.currentComparison = null;
        this.sourceCode = '';
        this.sourceLanguage = '';
        this.initializeUI();
    }

    /**
     * Initialize UI components
     */
    initializeUI() {
        if (!document.getElementById('translatorModal')) {
            this.createTranslatorModal();
        }
    }

    /**
     * Create the translator modal as a separate full-page view
     */
    createTranslatorModal() {
        const modalHTML = `
            <div id="translatorModal" class="fixed inset-0 z-50 hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900" style="display: none;">
                <!-- Header -->
                <div class="backdrop-blur-md bg-white/10 border-b border-white/20 shadow-2xl p-6 sticky top-0 z-40">
                    <div class="max-w-7xl mx-auto flex items-center justify-between">
                        <h1 class="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                            <i class="fas fa-language mr-2"></i>Language Translator
                        </h1>
                        <button onclick="translationUIManager.closeTranslatorModal()" class="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-all duration-300 font-semibold">
                            <i class="fas fa-times mr-2"></i>Back to Editor
                        </button>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="overflow-auto" style="height: calc(100vh - 80px);">
                    <div class="p-6">
                        <div class="max-w-7xl mx-auto space-y-6">
                            <!-- Input Section -->
                            <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
                                <h2 class="text-xl font-bold text-white mb-4">
                                    <i class="fas fa-code mr-2 text-purple-400"></i>Step 1: Enter Code to Translate
                                </h2>
                                
                                <!-- Language Selection Row -->
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <label class="text-white mb-2 block font-semibold text-sm">Source Language:</label>
                                        <select id="sourceLanguageSelect" class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none transition">
                                            <option value="">-- Select Language --</option>
                                            <option value="c">C/C++</option>
                                            <option value="python">Python</option>
                                            <option value="custom">Custom Language</option>
                                        </select>
                                    </div>
                                    <div class="flex items-end">
                                        <button onclick="translationUIManager.clearSourceCode()" class="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 font-semibold text-sm">
                                            <i class="fas fa-trash mr-2"></i>Clear
                                        </button>
                                    </div>
                                    <div class="flex items-end">
                                        <button onclick="translationUIManager.translateCode()" class="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 font-semibold text-sm">
                                            <i class="fas fa-exchange-alt mr-2"></i>Translate
                                        </button>
                                    </div>
                                </div>

                                <!-- Code Input Area -->
                                <div>
                                    <label class="text-white mb-2 block font-semibold">Paste code to translate:</label>
                                    <textarea id="sourceCodeTextarea" placeholder="Paste or type C/Python code here..." class="w-full h-48 bg-gray-900 text-green-400 border-2 border-gray-600 rounded-lg p-4 font-mono text-sm focus:border-purple-500 focus:outline-none resize-none"></textarea>
                                </div>

                                <!-- Program Input Area -->
                                <div class="mt-4">
                                    <label class="text-white mb-2 block font-semibold">Program Input (for scanf/input calls):</label>
                                    <textarea id="programInputTextarea" placeholder="Enter program input, one value per line..." class="w-full h-20 bg-gray-900 text-blue-400 border-2 border-gray-600 rounded-lg p-4 font-mono text-sm focus:border-purple-500 focus:outline-none resize-none"></textarea>
                                    <p class="text-gray-400 text-xs mt-1">If your code has scanf/input, provide values here (numbers, strings, etc.)</p>
                                </div>
                            </div>

                            <!-- Results Section (Hidden until translation) -->
                            <div id="resultsSection" style="display: none;">
                                <!-- Tabs -->
                                <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
                                    <h2 class="text-xl font-bold text-white mb-4">
                                        <i class="fas fa-chart-bar mr-2 text-purple-400"></i>Step 2: Review Translation & Comparison
                                    </h2>
                                    
                                    <div class="flex gap-2 mb-6 border-b border-gray-600 flex-wrap">
                                        <button onclick="translationUIManager.switchTab('translated')" class="translationTab px-4 py-2 text-white rounded-t-lg bg-purple-600/50 border-b-2 border-purple-500 font-semibold">
                                            <i class="fas fa-code mr-2"></i>Translated Code
                                        </button>
                                        <button onclick="translationUIManager.switchTab('lexing')" class="translationTab px-4 py-2 text-gray-300 rounded-t-lg hover:bg-purple-600/30 transition font-semibold">
                                            <i class="fas fa-layer-group mr-2"></i>Lexing
                                        </button>
                                        <button onclick="translationUIManager.switchTab('parsing')" class="translationTab px-4 py-2 text-gray-300 rounded-t-lg hover:bg-purple-600/30 transition font-semibold">
                                            <i class="fas fa-sitemap mr-2"></i>Parsing
                                        </button>
                                        <button onclick="translationUIManager.switchTab('interpretation')" class="translationTab px-4 py-2 text-gray-300 rounded-t-lg hover:bg-purple-600/30 transition font-semibold">
                                            <i class="fas fa-play-circle mr-2"></i>Execution
                                        </button>
                                        <button onclick="translationUIManager.switchTab('metrics')" class="translationTab px-4 py-2 text-gray-300 rounded-t-lg hover:bg-purple-600/30 transition font-semibold">
                                            <i class="fas fa-chart-bar mr-2"></i>Metrics
                                        </button>
                                    </div>

                                    <!-- Translated Code View -->
                                    <div id="translatedCodeView" class="translationView" style="display: block;">
                                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <h3 class="text-lg font-semibold text-white mb-3">Original Code</h3>
                                                <div class="bg-gray-900 rounded-lg p-4 border border-gray-600 max-h-96 overflow-auto">
                                                    <pre id="originalCodeDisplay" class="text-green-400 text-sm font-mono whitespace-pre-wrap break-words">// Original code</pre>
                                                </div>
                                            </div>
                                            <div>
                                                <h3 class="text-lg font-semibold text-white mb-3">Translated Code</h3>
                                                <div class="bg-gray-900 rounded-lg p-4 border border-gray-600 max-h-96 overflow-auto">
                                                    <pre id="translatedCodeDisplay" class="text-blue-400 text-sm font-mono whitespace-pre-wrap break-words">// Translated code</pre>
                                                </div>
                                            </div>
                                        </div>
                                        <div id="translationStats" class="bg-gray-900 rounded-lg p-4 border border-gray-600"></div>
                                    </div>

                                    <!-- Lexing Comparison View -->
                                    <div id="lexingComparisonView" class="translationView" style="display: none;">
                                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <h4 class="text-white font-semibold mb-2">Original Language Tokens</h4>
                                                <div id="originalTokensDisplay" class="bg-gray-800 rounded p-3 max-h-96 overflow-auto text-green-400 text-sm font-mono"></div>
                                            </div>
                                            <div>
                                                <h4 class="text-white font-semibold mb-2">Custom Language Tokens</h4>
                                                <div id="translatedTokensDisplay" class="bg-gray-800 rounded p-3 max-h-96 overflow-auto text-blue-400 text-sm font-mono"></div>
                                            </div>
                                        </div>
                                        <div id="tokenStatistics" class="grid grid-cols-2 md:grid-cols-5 gap-2"></div>
                                    </div>

                                    <!-- Parsing Comparison View -->
                                    <div id="parsingComparisonView" class="translationView" style="display: none;">
                                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <h4 class="text-white font-semibold mb-2">Original Language AST</h4>
                                                <div id="originalASTDisplay" class="bg-gray-800 rounded p-3 max-h-96 overflow-auto text-green-400 text-sm font-mono"></div>
                                            </div>
                                            <div>
                                                <h4 class="text-white font-semibold mb-2">Custom Language AST</h4>
                                                <div id="translatedASTDisplay" class="bg-gray-800 rounded p-3 max-h-96 overflow-auto text-blue-400 text-sm font-mono"></div>
                                            </div>
                                        </div>
                                        <div id="astMetrics" class="grid grid-cols-1 md:grid-cols-4 gap-2"></div>
                                    </div>

                                    <!-- Interpretation Comparison View -->
                                    <div id="interpretationComparisonView" class="translationView" style="display: none;">
                                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <h4 class="text-white font-semibold mb-2">Original Language Output</h4>
                                                <div id="originalOutputDisplay" class="bg-gray-800 rounded p-3 max-h-96 overflow-auto text-green-400 text-sm font-mono"></div>
                                            </div>
                                            <div>
                                                <h4 class="text-white font-semibold mb-2">Custom Language Output</h4>
                                                <div id="translatedOutputDisplay" class="bg-gray-800 rounded p-3 max-h-96 overflow-auto text-blue-400 text-sm font-mono"></div>
                                            </div>
                                        </div>
                                        <div id="outputComparison" class="bg-gray-800 rounded p-3"></div>
                                    </div>

                                    <!-- Metrics View -->
                                    <div id="metricsView" class="translationView" style="display: none;">
                                        <div id="metricsContent" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const container = document.body;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = modalHTML;
        container.appendChild(tempDiv.firstElementChild);
    }

    /**
     * Open the translator modal
     */
    openTranslatorModal() {
        const modal = document.getElementById('translatorModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.style.flexDirection = 'column';
        }
    }

    /**
     * Close the translator modal
     */
    closeTranslatorModal() {
        const modal = document.getElementById('translatorModal');
        if (modal) {
            modal.style.display = 'none';
        }
        // Clear results section
        document.getElementById('resultsSection').style.display = 'none';
    }

    /**
     * Clear source code textarea
     */
    clearSourceCode() {
        document.getElementById('sourceCodeTextarea').value = '';
        document.getElementById('sourceLanguageSelect').value = '';
        document.getElementById('programInputTextarea').value = '';
    }

    /**
     * Translate the code
     */
    async translateCode() {
        const sourceLanguage = document.getElementById('sourceLanguageSelect').value;
        const sourceCode = document.getElementById('sourceCodeTextarea').value;

        if (!sourceLanguage) {
            alert('⚠️ Please select a source language');
            return;
        }

        if (!sourceCode.trim()) {
            alert('⚠️ Please enter code to translate');
            return;
        }

        // Disable button and show loading state
        const translateBtn = document.getElementById('translateBtn');
        const originalBtnText = translateBtn?.textContent;
        if (translateBtn) {
            translateBtn.disabled = true;
            translateBtn.textContent = '⏳ Translating...';
        }

        try {
            // Wrap entire translation in timeout
            const translationPromise = (async () => {
                console.log(`%c🔄 TRANSLATE START`, 'color: cyan; font-weight: bold; font-size: 14px');
                console.log(`Source language: ${sourceLanguage}`);
                console.log(`Source code length: ${sourceCode.length} chars`);

                // Translate the code
                const translatedCode = this.translator.translate(sourceCode, sourceLanguage);
                console.log(`✅ Translation complete, output: ${translatedCode.length} chars`);

                // Capture program input
                const programInput = document.getElementById('programInputTextarea').value;
                const programInputList = programInput.trim().split('\n').filter(line => line.trim() !== '');
                console.log(`Program input values: ${programInputList.length} lines`);

                // Store for comparison
                this.currentTranslation = {
                    originalCode: sourceCode,
                    translatedCode: translatedCode,
                    sourceLanguage: sourceLanguage,
                    programInput: programInput,
                    programInputList: programInputList,
                    timestamp: new Date()
                };

                // Display the translation
                this.displayTranslation(sourceCode, translatedCode);

                // Generate and display comparison with input (with timeout protection)
                console.log('%c📊 GENERATING COMPARISON', 'color: purple; font-weight: bold');
                try {
                    const comparisonPromise = this.generateComparison(sourceCode, translatedCode, sourceLanguage, programInputList);
                    const comparisonResult = await Promise.race([
                        comparisonPromise,
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Comparison generation timeout')), 10000))
                    ]);
                    console.log('✅ Comparison generated');
                } catch (comparisonError) {
                    console.warn('⚠️ Comparison generation failed or timed out:', comparisonError.message);
                    // Don't block on comparison errors - show results anyway
                }

                // Show results section
                document.getElementById('resultsSection').style.display = 'block';

                console.log(`%c✅ TRANSLATE COMPLETE`, 'color: green; font-weight: bold; font-size: 14px');
            })();

            // Enforce 15-second timeout on entire translation
            await Promise.race([
                translationPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Translation process timeout')), 15000))
            ]);

        } catch (error) {
            console.error(`%c❌ TRANSLATE ERROR`, 'color: red; font-weight: bold; font-size: 14px', error);
            alert(`❌ Translation error: ${error.message}`);
        } finally {
            // Re-enable button
            if (translateBtn) {
                translateBtn.disabled = false;
                translateBtn.textContent = originalBtnText || '🔄 Translate';
            }
        }
    }

    /**
     * Display translated code
     */
    displayTranslation(originalCode, translatedCode) {
        document.getElementById('originalCodeDisplay').textContent = originalCode;
        document.getElementById('translatedCodeDisplay').textContent = translatedCode;

        const stats = this.translator.getTranslationDetails(originalCode, translatedCode);
        const statsHTML = `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div class="bg-gray-800 rounded p-3">
                    <div class="text-gray-400 text-sm">Original Lines</div>
                    <div class="text-green-400 font-bold text-lg">${stats.originalLines}</div>
                </div>
                <div class="bg-gray-800 rounded p-3">
                    <div class="text-gray-400 text-sm">Translated Lines</div>
                    <div class="text-blue-400 font-bold text-lg">${stats.translatedLines}</div>
                </div>
                <div class="bg-gray-800 rounded p-3">
                    <div class="text-gray-400 text-sm">Original Size</div>
                    <div class="text-green-400 font-bold text-lg">${stats.originalLength} chars</div>
                </div>
                <div class="bg-gray-800 rounded p-3">
                    <div class="text-gray-400 text-sm">Translated Size</div>
                    <div class="text-blue-400 font-bold text-lg">${stats.translatedLength} chars</div>
                </div>
            </div>
            <div class="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div class="bg-gray-800 rounded p-3">
                    <div class="text-gray-400 text-sm">Variables</div>
                    <div class="text-purple-400 font-bold text-lg">${stats.complexity.variables}</div>
                </div>
                <div class="bg-gray-800 rounded p-3">
                    <div class="text-gray-400 text-sm">Print Statements</div>
                    <div class="text-purple-400 font-bold text-lg">${stats.complexity.printStatements}</div>
                </div>
                <div class="bg-gray-800 rounded p-3">
                    <div class="text-gray-400 text-sm">Conditionals</div>
                    <div class="text-purple-400 font-bold text-lg">${stats.complexity.conditionals}</div>
                </div>
                <div class="bg-gray-800 rounded p-3">
                    <div class="text-gray-400 text-sm">Loops</div>
                    <div class="text-purple-400 font-bold text-lg">${stats.complexity.loops}</div>
                </div>
            </div>
        `;
        document.getElementById('translationStats').innerHTML = statsHTML;
    }

    /**
     * Generate comprehensive comparison
     */
    async generateComparison(originalCode, translatedCode, sourceLanguage, programInputList = []) {
        try {
            console.log('%c🔍 GENERATE COMPARISON START', 'color: purple; font-weight: bold; font-size: 13px');
            console.log('Program input list:', programInputList);

            // For original code: tokenize with generic lexer (no custom keywords)
            let originalResult = null;
            let translatedResult = null;

            try {
                // Tokenize original code with empty keywords to get generic tokens
                console.log('%c1️⃣ Tokenizing original code...', 'color: blue');
                console.log('Lexer type:', typeof ManualLexer);
                console.log('Code length:', originalCode.length);
                console.log('Code preview (first 100 chars):', originalCode.substring(0, 100));
                
                const genericLexer = new ManualLexer({});
                console.log('✅ Lexer instance created');
                
                const originalTokens = genericLexer.tokenize(originalCode);
                console.log('✅ Tokenization complete! Token count:', originalTokens.length);
                console.log('Token array:', originalTokens);
                console.log('Token types:', originalTokens.slice(0, 15).map(t => ({ type: t.type, value: String(t.value).substring(0, 20) })));
                
                originalResult = {
                    success: true,
                    tokens: originalTokens,
                    ast: null,
                    output: '',
                    error: null
                };
            } catch (e) {
                console.error('%c❌ ORIGINAL TOKENIZATION ERROR', 'color: red; font-weight: bold');
                console.error('Error message:', e.message);
                console.error('Error stack:', e.stack);
                console.error('Full error:', e);
                originalResult = { success: false, error: e.message, tokens: [], ast: null, output: '' };
            }

            try {
                // Compile translated code with custom language compiler
                console.log('%c2️⃣ Compiling translated code...', 'color: blue');
                const compiler = new RealTimeCompiler(CONFIG.CUSTOM_KEYWORDS);
                translatedResult = compiler.compile(translatedCode);
                console.log('✅ Compilation complete! Token count:', translatedResult.tokens?.length ?? 0);
            } catch (e) {
                console.error('%c❌ TRANSLATED COMPILATION ERROR', 'color: red; font-weight: bold');
                console.error('Error message:', e.message);
                translatedResult = { success: false, error: e.message, tokens: [], ast: null, output: '' };
            }

            // Parse original code - skip complex AST for C/Python to avoid hangs
            try {
                console.log('%c🔍 Preparing original code...', 'color: blue');
                if (originalResult.tokens && originalResult.tokens.length > 0) {
                    originalResult.ast = null;
                    originalResult.astTree = `Tokens: ${originalResult.tokens.length}`;
                    console.log('✅ Original code prepared');
                } else {
                    originalResult.ast = null;
                }
            } catch (e) {
                console.warn('⚠️ Error:', e.message);
                originalResult.ast = null;
            }

            // Format translated code AST as tree for consistent display (with timeout)
            try {
                console.log('%c🎯 Formatting translated code AST as tree...', 'color: blue');
                if (translatedResult.ast && !translatedResult.astTree) {
                    try {
                        const astBuilder = new GenericASTBuilder();
                        const formatPromise = Promise.race([
                            Promise.resolve().then(() => astBuilder.formatAsTree(translatedResult.ast)),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('AST format timeout')), 1000))
                        ]);
                        
                        const treeOutput = await formatPromise;
                        translatedResult.astTree = treeOutput;
                        console.log('✅ Translated code AST formatted as tree');
                    } catch (formatError) {
                        console.warn('⚠️ AST tree formatting timed out, using fallback');
                        // Keep the old formatted AST from compiler
                    }
                } else {
                    console.log('⚠️ No AST available or already formatted for translated code');
                }
            } catch (e) {
                console.warn('⚠️ Translated code AST formatting error:', e.message);
            }

            console.log('%c3️⃣ Displaying comparison...', 'color: blue');
            console.log('Original tokens to display:', originalResult.tokens?.length ?? 0);
            console.log('Translated tokens to display:', translatedResult.tokens?.length ?? 0);
            console.log('Original AST:', originalResult.ast);
            console.log('Translated AST:', translatedResult.ast);

            // Build full comparison object
            const comparison = {
                lexing: {
                    originalResult,
                    translatedResult,
                    comparison: this.compareLexingPhase(originalResult, translatedResult)
                },
                parsing: {
                    originalResult,
                    translatedResult,
                    comparison: {}
                },
                interpretation: {
                    originalResult,
                    translatedResult,
                    comparison: {}
                }
            };

            this.displayLexingComparison(originalResult, translatedResult);
            console.log('✅ Lexing display complete');
            
            this.displayParsingComparison(originalResult, translatedResult);
            console.log('✅ Parsing display complete');
            
            this.displayInterpretationComparison(originalResult, translatedResult);
            console.log('✅ Interpretation display complete');
            
            this.displayMetrics(originalCode, translatedCode);
            console.log('✅ Metrics display complete');

            console.log('%c✅ COMPARISON COMPLETE', 'color: green; font-weight: bold; font-size: 13px');
            return comparison;

        } catch (error) {
            console.error('%c❌ COMPARISON GENERATION FATAL ERROR', 'color: red; font-weight: bold; font-size: 13px');
            console.error('Error:', error.message);
            console.error('Stack:', error.stack);
            return null;
        }
    }

    /**
     * Compare lexing phase
     */
    compareLexingPhase(originalResult, translatedResult) {
        // Simple comparison of token statistics
        const originalTokens = originalResult.tokens || [];
        const translatedTokens = translatedResult.tokens || [];
        
        return {
            originalCount: originalTokens.length,
            translatedCount: translatedTokens.length,
            difference: Math.abs(translatedTokens.length - originalTokens.length)
        };
    }

    /**
     * Display lexing phase comparison
     */
    displayLexingComparison(originalResult, translatedResult) {
        try {
            console.log('%c🎯 DISPLAY LEXING COMPARISON START', 'color: cyan; font-weight: bold');
            console.log('originalResult object:', originalResult);
            console.log('translatedResult object:', translatedResult);
            
            // Defensive checks
            if (!originalResult) {
                console.error('❌ originalResult is null/undefined');
                originalResult = { tokens: [] };
            }
            if (!translatedResult) {
                console.error('❌ translatedResult is null/undefined');
                translatedResult = { tokens: [] };
            }

            const originalTokens = Array.isArray(originalResult.tokens) ? originalResult.tokens : (originalResult.tokens || []);
            const translatedTokens = Array.isArray(translatedResult.tokens) ? translatedResult.tokens : (translatedResult.tokens || []);

            console.log('%c📊 TOKEN STATISTICS', 'color: magenta; font-weight: bold');
            console.log('Original tokens array:', originalTokens);
            console.log('Original tokens count:', originalTokens.length);
            console.log('Translated tokens count:', translatedTokens.length);
            
            if (originalTokens.length > 0) {
                console.log('Sample original tokens:', originalTokens.slice(0, 5).map(t => ({ type: t.type, value: String(t.value).substring(0, 15) })));
            }
            if (translatedTokens.length > 0) {
                console.log('Sample translated tokens:', translatedTokens.slice(0, 5).map(t => ({ type: t.type, value: String(t.value).substring(0, 15) })));
            }

            const originalTokensHTML = originalTokens.length > 0 
                ? originalTokens.slice(0, 30).map(t => {
                    const tokenType = t.type || 'UNKNOWN';
                    const tokenValue = String(t.value || t.literal || '').substring(0, 25);
                    return `<div class="text-xs mb-1">${tokenType}: <span class="text-yellow-300">${this.escapeHtml(tokenValue)}</span></div>`;
                }).join('')
                : '<div class="text-gray-500 text-sm">No tokens generated</div>';

            const translatedTokensHTML = translatedTokens.length > 0
                ? translatedTokens.slice(0, 30).map(t => {
                    const tokenType = t.type || 'UNKNOWN';
                    const tokenValue = String(t.value || t.literal || '').substring(0, 25);
                    return `<div class="text-xs mb-1">${tokenType}: <span class="text-yellow-300">${this.escapeHtml(tokenValue)}</span></div>`;
                }).join('')
                : '<div class="text-gray-500 text-sm">No tokens generated</div>';

            console.log('HTML for original tokens:', originalTokensHTML.substring(0, 100));
            console.log('HTML for translated tokens:', translatedTokensHTML.substring(0, 100));

            const originalDisplay = document.getElementById('originalTokensDisplay');
            const translatedDisplay = document.getElementById('translatedTokensDisplay');

            if (!originalDisplay) {
                console.error('❌ originalTokensDisplay element not found!');
                return;
            }
            if (!translatedDisplay) {
                console.error('❌ translatedTokensDisplay element not found!');
                return;
            }

            originalDisplay.innerHTML = originalTokensHTML;
            translatedDisplay.innerHTML = translatedTokensHTML;
            
            console.log('✅ Token HTML updated in DOM');

            const tokenStats = this.getTokenStatistics(originalTokens, translatedTokens);
            const statsHTML = Object.entries(tokenStats).map(([key, { original, translated }]) =>
                `<div class="bg-gray-800 rounded p-2">
                    <div class="text-xs text-gray-400 font-semibold">${key}</div>
                    <div class="text-white text-sm"><span class="text-green-400">${original}</span> / <span class="text-blue-400">${translated}</span></div>
                </div>`
            ).join('');

            const totalTokenStats = `
                <div class="bg-gradient-to-r from-green-900/50 to-blue-900/50 rounded p-3 mb-3">
                    <div class="text-white font-semibold mb-2">Token Count Summary:</div>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div>Original: <span class="text-green-400 font-bold">${originalTokens.length}</span> tokens</div>
                        <div>Translated: <span class="text-blue-400 font-bold">${translatedTokens.length}</span> tokens</div>
                        <div>Difference: <span class="text-yellow-400 font-bold">${Math.abs(translatedTokens.length - originalTokens.length)}</span> tokens</div>
                        <div>Reduction: <span class="text-purple-400 font-bold">${originalTokens.length > 0 ? ((originalTokens.length - translatedTokens.length) / originalTokens.length * 100).toFixed(1) : 0}%</span></div>
                    </div>
                </div>
            `;

            const statsDisplay = document.getElementById('tokenStatistics');
            if (statsDisplay) {
                statsDisplay.innerHTML = totalTokenStats + statsHTML;
                console.log('✅ Statistics updated in DOM');
            }

            console.log('%c✅ LEXING DISPLAY COMPLETE', 'color: green; font-weight: bold');

        } catch (error) {
            console.error('%c❌ DISPLAY LEXING ERROR', 'color: red; font-weight: bold');
            console.error('Error:', error.message);
            console.error('Stack:', error.stack);
        }
    }

    /**
     * Display parsing phase comparison
     */
    displayParsingComparison(originalResult, translatedResult) {
        try {
            console.log('🎯 displayParsingComparison starting...');

            // Get ASTs
            const originalAST = originalResult?.ast;
            const translatedAST = translatedResult?.ast;

            console.log('originalAST:', originalAST ? 'exists' : 'null');
            console.log('translatedAST:', translatedAST ? 'exists' : 'null');

            // Create tree-formatted string representations
            let originalASTString = '[No AST available]';
            let translatedASTString = '[No AST available]';

            // Check for astTree first (used for token counts), then fall back to AST
            if (originalResult?.astTree) {
                originalASTString = originalResult.astTree;
                console.log('✅ Original astTree display (token count)');
            } else if (originalAST) {
                try {
                    // Generate tree format from AST
                    const astBuilder = new GenericASTBuilder();
                    originalASTString = astBuilder.formatAsTree(originalAST);
                    console.log('✅ Original AST converted to tree format');
                } catch (e) {
                    console.warn('⚠️ Could not format original AST:', e.message);
                    // Fallback to JSON
                    try {
                        originalASTString = JSON.stringify(originalAST, null, 2);
                    } catch {
                        originalASTString = 'Error visualizing AST';
                    }
                }
            }

            if (translatedAST) {
                try {
                    // Always use the tree format for consistency with original AST
                    if (translatedResult?.astTree) {
                        translatedASTString = translatedResult.astTree;
                    } else {
                        // Fallback to formatted AST from compiler or JSON
                        if (translatedResult?.formattedAST) {
                            translatedASTString = translatedResult.formattedAST;
                        } else {
                            translatedASTString = JSON.stringify(translatedAST, null, 2);
                        }
                    }
                    console.log('✅ Translated AST converted to string format');
                } catch (e) {
                    console.warn('⚠️ Could not format translated AST:', e.message);
                    // Fallback to JSON for visibility
                    try {
                        translatedASTString = JSON.stringify(translatedAST, null, 2);
                    } catch {
                        translatedASTString = 'Error visualizing AST';
                    }
                }
            }

            // Increase output size limit for better visibility
            originalASTString = originalASTString.substring(0, 3000);
            translatedASTString = translatedASTString.substring(0, 3000);

            const originalASTHTML = `<pre class="text-green-400 text-xs overflow-auto">${this.escapeHtml(originalASTString)}</pre>`;
            const translatedASTHTML = `<pre class="text-blue-400 text-xs overflow-auto">${this.escapeHtml(translatedASTString)}</pre>`;

            console.log('Updating DOM...');
            const originalDisplay = document.getElementById('originalASTDisplay');
            const translatedDisplay = document.getElementById('translatedASTDisplay');

            if (originalDisplay) {
                originalDisplay.innerHTML = originalASTHTML;
                console.log('✅ Original AST DOM updated');
            }
            if (translatedDisplay) {
                translatedDisplay.innerHTML = translatedASTHTML;
                console.log('✅ Translated AST DOM updated');
            }

            // Get statement counts
            const originalStatements = originalAST?.body?.length ?? 0;
            const translatedStatements = translatedAST?.body?.length ?? 0;

            console.log('Statement counts: Original=' + originalStatements + ', Translated=' + translatedStatements);

            const metricsHTML = `
                <div class="bg-gray-800 rounded p-2">
                    <div class="text-xs text-gray-400 font-semibold">Original Statements</div>
                    <div class="text-white text-sm text-green-400">${originalStatements}</div>
                </div>
                <div class="bg-gray-800 rounded p-2">
                    <div class="text-xs text-gray-400 font-semibold">Translated Statements</div>
                    <div class="text-white text-sm text-blue-400">${translatedStatements}</div>
                </div>
                <div class="bg-gray-800 rounded p-2">
                    <div class="text-xs text-gray-400 font-semibold">AST Status</div>
                    <div class="text-white text-sm text-purple-400">
                        ${originalAST ? '✅ Parsed' : '⚠️ Not parsed'}
                    </div>
                </div>
                <div class="bg-gray-800 rounded p-2">
                    <div class="text-xs text-gray-400 font-semibold">Phase</div>
                    <div class="text-white text-sm text-blue-400">Lexing/Parsing</div>
                </div>
            `;
            
            const statsDisplay = document.getElementById('astMetrics');
            if (statsDisplay) {
                statsDisplay.innerHTML = metricsHTML;
                console.log('✅ Metrics DOM updated');
            }

            console.log('✅ displayParsingComparison complete');

        } catch (error) {
            console.error('❌ displayParsingComparison error:', error.message);
            console.error('Stack:', error.stack);
            // Don't rethrow - just log
        }
    }

    /**
     * Display interpretation phase comparison
     */
    displayInterpretationComparison(originalResult, translatedResult) {
        const sourceLanguage = this.currentTranslation?.sourceLanguage || '';
        
        // Original C/Python code cannot be executed in browser - show informational message
        let originalOutput = '';
        if (sourceLanguage.toLowerCase() === 'c' || sourceLanguage.toLowerCase() === 'cpp' || sourceLanguage.toLowerCase() === 'c++') {
            originalOutput = `⚠️ C/C++ code cannot be executed in the browser.\nThe code has been lexically and syntactically analyzed above.\nUse a C compiler (gcc, clang) to execute the original code.`;
        } else if (sourceLanguage.toLowerCase() === 'python') {
            originalOutput = `⚠️ Python code execution is not available in the browser.\nUse Python interpreter to run the original code.`;
        } else {
            originalOutput = String(originalResult.output || '').substring(0, 500);
        }

        const translatedOutput = String(translatedResult.output || '').substring(0, 500);

        document.getElementById('originalOutputDisplay').textContent = originalOutput || '[No output]';
        document.getElementById('translatedOutputDisplay').textContent = translatedOutput || '[No output]';

        const comparisonHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <span class="text-gray-400">Original Status:</span>
                    <span class="text-yellow-400 font-semibold">⚠️ Cannot execute</span>
                </div>
                <div>
                    <span class="text-gray-400">Translated Status:</span>
                    <span class="text-blue-400 font-semibold">${translatedResult.success ? '✅ Success' : '❌ Error'}</span>
                </div>
                <div colspan="2" class="md:col-span-2">
                    <span class="text-gray-400">Status:</span>
                    <span class="text-blue-400 font-semibold">
                        ℹ️ Original code analyzed at lexing/parsing phase. Translated code executed above.
                    </span>
                </div>
            </div>
        `;
        document.getElementById('outputComparison').innerHTML = comparisonHTML;
    }

    /**
     * Display metrics and analysis
     */
    displayMetrics(originalCode, translatedCode) {
        const originalMetrics = this.getCodeMetrics(originalCode);
        const translatedMetrics = this.getCodeMetrics(translatedCode);

        const metricsHTML = `
            <div class="bg-gray-800 rounded p-4 mb-4">
                <h4 class="text-white font-semibold mb-3">Code Size Comparison</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <span class="text-gray-400">Original:</span>
                        <div class="text-white mt-2">
                            <div class="text-sm">Lines: <span class="text-green-400">${originalMetrics.lines}</span></div>
                            <div class="text-sm">Characters: <span class="text-green-400">${originalMetrics.characters}</span></div>
                        </div>
                    </div>
                    <div>
                        <span class="text-gray-400">Translated:</span>
                        <div class="text-white mt-2">
                            <div class="text-sm">Lines: <span class="text-blue-400">${translatedMetrics.lines}</span></div>
                            <div class="text-sm">Characters: <span class="text-blue-400">${translatedMetrics.characters}</span></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="bg-gray-800 rounded p-4">
                <h4 class="text-white font-semibold mb-3">Complexity Analysis</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <span class="text-gray-400">Original:</span>
                        <div class="text-white mt-2 text-sm">
                            <div>Loops: <span class="text-green-400">${originalMetrics.complexity.loops}</span></div>
                            <div>Conditionals: <span class="text-green-400">${originalMetrics.complexity.conditionals}</span></div>
                            <div>Cyclomatic: <span class="text-green-400">${originalMetrics.complexity.cyclomaticComplexity}</span></div>
                        </div>
                    </div>
                    <div>
                        <span class="text-gray-400">Translated:</span>
                        <div class="text-white mt-2 text-sm">
                            <div>Loops: <span class="text-blue-400">${translatedMetrics.complexity.loops}</span></div>
                            <div>Conditionals: <span class="text-blue-400">${translatedMetrics.complexity.conditionals}</span></div>
                            <div>Cyclomatic: <span class="text-blue-400">${translatedMetrics.complexity.cyclomaticComplexity}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('metricsContent').innerHTML = metricsHTML;
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        document.querySelectorAll('.translationView').forEach(view => {
            view.style.display = 'none';
        });

        document.querySelectorAll('.translationTab').forEach(tab => {
            tab.classList.remove('bg-purple-600/50', 'border-b-2', 'border-purple-500', 'text-white');
            tab.classList.add('text-gray-300');
        });

        const viewMap = {
            'translated': 'translatedCodeView',
            'lexing': 'lexingComparisonView',
            'parsing': 'parsingComparisonView',
            'interpretation': 'interpretationComparisonView',
            'metrics': 'metricsView'
        };

        if (viewMap[tabName]) {
            document.getElementById(viewMap[tabName]).style.display = 'block';
        }

        if (event?.target) {
            event.target.closest('.translationTab')?.classList.remove('text-gray-300');
            event.target.closest('.translationTab')?.classList.add('bg-purple-600/50', 'border-b-2', 'border-purple-500', 'text-white');
        }
    }

    // ===== Helper Methods =====

    getTokenStatistics(originalTokens, translatedTokens) {
        return {
            'Keywords': {
                original: originalTokens.filter(t => t.type === 'KEYWORD').length,
                translated: translatedTokens.filter(t => t.type === 'KEYWORD').length
            },
            'Identifiers': {
                original: originalTokens.filter(t => t.type === 'IDENTIFIER').length,
                translated: translatedTokens.filter(t => t.type === 'IDENTIFIER').length
            },
            'Numbers': {
                original: originalTokens.filter(t => t.type === 'NUMBER').length,
                translated: translatedTokens.filter(t => t.type === 'NUMBER').length
            },
            'Strings': {
                original: originalTokens.filter(t => t.type === 'STRING').length,
                translated: translatedTokens.filter(t => t.type === 'STRING').length
            },
            'Operators': {
                original: originalTokens.filter(t => t.type === 'OPERATOR').length,
                translated: translatedTokens.filter(t => t.type === 'OPERATOR').length
            }
        };
    }

    getCodeMetrics(code) {
        return {
            lines: code.split('\n').length,
            characters: code.length,
            words: code.split(/\s+/).length,
            complexity: {
                loops: (code.match(/\b(while|for|jabtak)\b/gi) || []).length,
                conditionals: (code.match(/\b(if|else|agar|warna)\b/gi) || []).length,
                cyclomaticComplexity: Math.max(1, (code.match(/\b(if|agar|warna)\b/gi) || []).length + 1)
            }
        };
    }

    normalizeOutput(output) {
        return String(output || '').trim().replace(/\s+/g, ' ');
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }
}

// Global instance
let translationUIManager;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof CodeTranslator !== 'undefined' && typeof ComparisonManager !== 'undefined') {
        translationUIManager = new TranslationUIManager();
    }
});
