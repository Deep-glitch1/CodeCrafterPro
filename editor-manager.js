// editor-manager.js
// Monaco editor setup, persistence, breakpoints, and diagnostics

class EditorManager {
    constructor(options = {}) {
        this.editors = {};
        this.currentEditor = null;
        this.markerOwner = options.markerOwner || 'codecrafter';
        this.currentModeGetter = options.getCurrentMode || null;
        this.breakpoints = {
            main: new Set(),
            c: new Set(),
            custom: new Set()
        };
        this.breakpointDecorations = {
            main: [],
            c: [],
            custom: []
        };
    }

    setCurrentModeGetter(getter) {
        this.currentModeGetter = getter;
    }

    getCurrentMode() {
        return this.currentModeGetter ? this.currentModeGetter() : 'c';
    }

    async initializeEditors() {
        require.config({ paths: { 'vs': 'https://unpkg.com/monaco-editor/min/vs' } });

        return new Promise((resolve) => {
            require(['vs/editor/editor.main'], () => {
                // Main editor
                this.editors.main = monaco.editor.create(document.getElementById('mainEditor'), {
                    value: CONFIG.COMPILERS.C.defaultCode,
                    language: 'c',
                    theme: 'vs-dark',
                    fontSize: 14,
                    glyphMargin: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true
                });

                // C Editor for dual mode
                this.editors.c = monaco.editor.create(document.getElementById('cEditor'), {
                    value: CONFIG.COMPILERS.C.defaultCode,
                    language: 'c',
                    theme: 'vs-dark',
                    fontSize: 13,
                    glyphMargin: true,
                    minimap: { enabled: false }
                });

                // Custom language editor for dual mode
                this.editors.custom = monaco.editor.create(document.getElementById('customEditor'), {
                    value: CONFIG.COMPILERS.CUSTOM.defaultCode,
                    language: 'plaintext',
                    theme: 'vs-dark',
                    fontSize: 13,
                    glyphMargin: true,
                    minimap: { enabled: false }
                });

                this.currentEditor = this.editors.main;
                window.currentEditor = this.currentEditor;

                this.attachEditorPersistence();
                this.restoreSavedCode();
                this.setupBreakpointHandling();
                resolve();
            });
        });
    }

    attachEditorPersistence() {
        const save = (mode, code) => {
            try {
                localStorage.setItem(`codecrafter_${mode}_code`, code);
            } catch (err) {
                console.warn('Storage unavailable', err);
            }
        };

        this.editors.main.onDidChangeModelContent(() => {
            const mode = this.getCurrentMode() === 'custom' ? 'custom' : 'c';
            save(mode, this.editors.main.getValue());
        });

        this.editors.c.onDidChangeModelContent(() => {
            save('both_c', this.editors.c.getValue());
        });

        this.editors.custom.onDidChangeModelContent(() => {
            save('both_custom', this.editors.custom.getValue());
        });
    }

    restoreSavedCode() {
        const load = (mode, fallback) => {
            try {
                return localStorage.getItem(`codecrafter_${mode}_code`) || fallback;
            } catch (err) {
                return fallback;
            }
        };

        this.editors.main.setValue(load('c', CONFIG.COMPILERS.C.defaultCode));
        this.editors.c.setValue(load('both_c', CONFIG.COMPILERS.C.defaultCode));
        this.editors.custom.setValue(load('both_custom', CONFIG.COMPILERS.CUSTOM.defaultCode));
    }

    setupBreakpointHandling() {
        const attach = (key) => {
            const editor = this.editors[key];
            if (!editor) return;
            editor.onMouseDown((e) => {
                if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
                    const lineNumber = e.target.position?.lineNumber;
                    if (lineNumber) {
                        this.toggleBreakpoint(key, lineNumber);
                    }
                }
            });
        };

        attach('main');
        attach('c');
        attach('custom');
    }

    toggleBreakpoint(editorKey, lineNumber) {
        const breakpoints = this.breakpoints[editorKey];
        if (!breakpoints) return;
        if (breakpoints.has(lineNumber)) {
            breakpoints.delete(lineNumber);
        } else {
            breakpoints.add(lineNumber);
        }
        this.updateBreakpointDecorations(editorKey);
    }

    updateBreakpointDecorations(editorKey) {
        const editor = this.editors[editorKey];
        if (!editor) return;
        const decorations = Array.from(this.breakpoints[editorKey] || []).map(line => ({
            range: new monaco.Range(line, 1, line, 1),
            options: {
                isWholeLine: true,
                glyphMarginClassName: 'breakpoint-glyph',
                glyphMarginHoverMessage: { value: 'Breakpoint' }
            }
        }));
        this.breakpointDecorations[editorKey] = editor.deltaDecorations(
            this.breakpointDecorations[editorKey] || [],
            decorations
        );
    }

    clearDiagnostics(editorKey) {
        const editor = this.editors[editorKey];
        if (!editor) return;
        const model = editor.getModel();
        if (!model) return;
        monaco.editor.setModelMarkers(model, this.markerOwner, []);
    }

    applyDiagnostics(editorKey, diagnostics) {
        const editor = this.editors[editorKey];
        if (!editor) return;
        const model = editor.getModel();
        if (!model) return;
        const markers = (diagnostics || []).map((diag) => ({
            severity: diag.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Error,
            message: diag.message,
            startLineNumber: diag.line || 1,
            startColumn: diag.column || 1,
            endLineNumber: diag.endLine || diag.line || 1,
            endColumn: diag.endColumn || (diag.column ? diag.column + 1 : 2)
        }));
        monaco.editor.setModelMarkers(model, this.markerOwner, markers);
    }

    getSavedCode(mode, fallback) {
        try {
            return localStorage.getItem(`codecrafter_${mode}_code`) || fallback;
        } catch (err) {
            return fallback;
        }
    }

    setMode(mode) {
        switch (mode) {
            case 'c':
                this.currentEditor = this.editors.main;
                this.editors.main.updateOptions({ language: 'c' });
                this.editors.main.setValue(this.getSavedCode('c', CONFIG.COMPILERS.C.defaultCode));
                window.currentEditor = this.currentEditor;
                break;
            case 'custom':
                this.currentEditor = this.editors.main;
                this.editors.main.updateOptions({ language: 'plaintext' });
                this.editors.main.setValue(this.getSavedCode('custom', CONFIG.COMPILERS.CUSTOM.defaultCode));
                window.currentEditor = this.currentEditor;
                break;
            case 'both':
                this.editors.c.setValue(this.getSavedCode('both_c', this.editors.c.getValue()));
                this.editors.custom.setValue(this.getSavedCode('both_custom', this.editors.custom.getValue()));
                this.currentEditor = null;
                window.currentEditor = null;
                break;
        }
    }

    getEditorValue(editorKey) {
        return this.editors[editorKey]?.getValue() || '';
    }

    setEditorValue(editorKey, value) {
        this.editors[editorKey]?.setValue(value);
    }

    getEditor(editorKey) {
        return this.editors[editorKey] || null;
    }

    getBreakpoints(editorKey) {
        return this.breakpoints[editorKey] || new Set();
    }
}

window.EditorManager = EditorManager;
