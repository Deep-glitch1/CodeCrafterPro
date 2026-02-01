// stats-manager.js
// Compilation timing stats

class StatsManager {
    constructor() {
        this.stats = {
            lexerTime: 0,
            astTime: 0,
            irTime: 0,
            totalTime: 0
        };
    }

    reset() {
        this.stats = {
            lexerTime: 0,
            astTime: 0,
            irTime: 0,
            totalTime: 0
        };
        this.updateDisplay();
    }

    updateTimings(partial) {
        this.stats = { ...this.stats, ...partial };
    }

    setTotal(totalTime) {
        this.stats.totalTime = totalTime;
        this.updateDisplay();
    }

    updateDisplay() {
        const total = Math.max(this.stats.totalTime, 1);
        const pct = (value) => Math.min(100, (value / total) * 100);

        document.getElementById('lexerTime').textContent = `${this.stats.lexerTime.toFixed(2)}ms`;
        document.getElementById('astTime').textContent = `${this.stats.astTime.toFixed(2)}ms`;
        document.getElementById('irTime').textContent = `${this.stats.irTime.toFixed(2)}ms`;
        document.getElementById('totalTime').textContent = `${this.stats.totalTime.toFixed(2)}ms`;

        document.getElementById('lexerBar').style.width = `${pct(this.stats.lexerTime)}%`;
        document.getElementById('astBar').style.width = `${pct(this.stats.astTime)}%`;
        document.getElementById('irBar').style.width = `${pct(this.stats.irTime)}%`;
        document.getElementById('totalBar').style.width = '100%';
    }
}

window.StatsManager = StatsManager;
