// main.js
// Application entrypoint

document.addEventListener('DOMContentLoaded', () => {
    window.app = new window.CodeCrafterApp();
    setTimeout(() => {
        window.app.refreshPresetDropdown();
        window.app.updateWasmBadge(false);
    }, 500);
});