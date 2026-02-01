// ui-actions.js
// UI helpers and global action wrappers

function toggleBot() {
    document.getElementById('botPanel').classList.toggle('open');
}

function showOutputTab(tabId) {
    // Update tabs
    document.querySelectorAll('.output-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    document.querySelectorAll('.output-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    // Activate selected tab
    const tab = Array.from(document.querySelectorAll('.output-tab')).find(t =>
        t.getAttribute('onclick')?.includes(tabId)
    );

    const panel = document.getElementById(tabId);

    if (tab) tab.classList.add('active');
    if (panel) panel.classList.add('active');
}

// Global compiler functions
function changeCompilerMode() {
    if (window.app) {
        window.app.changeCompilerMode();
    }
}

function compileAndRun() {
    if (window.app) {
        window.app.compileAndRun();
    }
}

function runCompilerStage(stage) {
    if (window.app) {
        window.app.runCompilerStage(stage);
    }
}

function runSelectedStage() {
    const select = document.getElementById('stageSelect');
    const stage = select?.value;
    if (stage) {
        runCompilerStage(stage);
    }
}

function debugRun() {
    window.app?.debugRun();
}

function loadSampleProgram() {
    const select = document.getElementById('sampleSelect');
    const key = select?.value;
    if (window.app && key) {
        window.app.loadSample(key);
    }
}

function saveInputPreset() {
    window.app?.saveInputPreset();
}

function applyInputPreset() {
    window.app?.applyInputPreset();
}

function deleteInputPreset() {
    window.app?.deleteInputPreset();
}
