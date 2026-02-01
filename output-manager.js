// output-manager.js
// Output panels, errors, toasts, and status badges

class OutputManager {
    clearOutputs() {
        const panels = ['lexerOutput', 'astOutput', 'irOutput', 'optimizedIrOutput', 'executionOutput', 'comparisonOutput'];
        panels.forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.textContent = "Output will appear here...";
                panel.className = panel.className.replace(/\b(success|error|warning)\b/g, '');
            }
        });
    }

    showError(title, message, stackTrace = '') {
        const output = document.getElementById('executionOutput');
        const previous = output.textContent || '';
        const injected = stackTrace
            ? `❌ ${title}\n${message}\n\nStack Trace:\n${stackTrace}`
            : `❌ ${title}\n${message}`;
        output.textContent = previous ? `${previous}\n\n${injected}` : injected;
        output.className = output.className + ' error';
        showOutputTab('executionOutput');

        console.error(title, message);
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('visible'));
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    updateWasmBadge(isWasm) {
        const badge = document.getElementById('wasmStatusBadge');
        if (!badge) return;
        badge.textContent = isWasm ? 'WASM' : 'Fallback';
        badge.className = `wasm-badge ${isWasm ? 'badge-success' : 'badge-warning'}`;
    }
}

window.OutputManager = OutputManager;
