// ai-assistant.js
// AI Assistant with Voice and Code Generation

class AIAssistant {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.setupVoiceRecognition();
    }

    setupVoiceRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateListeningStatus(true);
            };
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                document.getElementById('nlPrompt').value = transcript;
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                this.updateListeningStatus(false);
                this.showNotification(`Voice recognition error: ${event.error}`, 'error');
            };
            
            this.recognition.onend = () => {
                this.isListening = false;
                this.updateListeningStatus(false);
            };
        }
    }

    updateListeningStatus(listening) {
        const micBtn = document.querySelector('[onclick="startVoiceInput()"]');
        const promptField = document.getElementById('nlPrompt');
        
        if (listening) {
            micBtn.innerHTML = '<i class="fas fa-microphone-slash mr-2"></i>Stop';
            micBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
            promptField.placeholder = "🎤 Listening...";
        } else {
            micBtn.innerHTML = '<i class="fas fa-microphone mr-2"></i>Voice Input';
            micBtn.style.background = 'linear-gradient(135deg, #7c3aed, #2563eb)';
            promptField.placeholder = "Describe your logic or what you want to code...";
        }
    }

    async generateCodeFromPrompt() {
        const prompt = document.getElementById('nlPrompt').value.trim();
        if (!prompt) {
            this.showNotification('Please enter a description first', 'warning');
            return;
        }

        this.showLoading(true);
        
        try {
            // Try to use AI API if available
            const generated = await this.callAIAPI(prompt);
            
            // Apply to editor based on current mode
            const mode = document.getElementById('compilerMode').value;
            const app = window.app;
            
            if (mode === 'both' && app?.editors?.c && app?.editors?.custom) {
                if (generated.cCode) {
                    app.editors.c.setValue(generated.cCode);
                }
                if (generated.customCode) {
                    app.editors.custom.setValue(generated.customCode);
                }
                this.showNotification('Code generated for both editors!', 'success');
            } else if (mode === 'custom' && app?.editors?.main) {
                app.editors.main.setValue(generated.customCode || generated.cCode || '');
                this.showNotification('Custom language code generated!', 'success');
            } else {
                const editor = window.currentEditor || app?.editors?.main;
                if (editor) {
                    editor.setValue(generated.cCode || generated.customCode || '');
                    this.showNotification('Code generated successfully!', 'success');
                }
            }
            
            const output = document.getElementById('executionOutput');
            const preview = generated.cCode && generated.customCode ? `${generated.cCode}\n\n---\n\n${generated.customCode}` : (generated.cCode || generated.customCode || '');
            output.textContent = `✅ AI Generated Code:\n\n${preview}`;
            showOutputTab('executionOutput');
        } catch (error) {
            console.error('AI generation failed:', error);
            // Fallback to template-based generation
            this.useFallbackGeneration(prompt);
        } finally {
            this.showLoading(false);
        }
    }

    async callAIAPI(prompt) {
        // Placeholder for real AI API.
        return new Promise((resolve) => {
            setTimeout(() => {
                const mode = document.getElementById('compilerMode').value;
                const baseC = `// Generated from: "${prompt}"
#include <stdio.h>

int main() {
    printf("Hello from AI-generated C code!\\n");
    printf("Your request: ${prompt}\\n");
    return 0;
}`;

                const baseCustom = `likho "AI-generated custom language"
maano note = "${prompt}"
likho note`;

                if (mode === 'both') {
                    resolve({ cCode: baseC, customCode: baseCustom });
                } else if (mode === 'custom') {
                    resolve({ customCode: baseCustom });
                } else {
                    resolve({ cCode: baseC });
                }
            }, 800);
        });
    }

    useFallbackGeneration(prompt) {
        const templates = {
            factorial: {
                c: `// Factorial Calculation
#include <stdio.h>

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    int num = 5;
    printf("Factorial of %d is %d\\n", num, factorial(num));
    return 0;
}`,
                custom: `maano num = 5
maano fact = 1
maano i = 1

jabtak i <= num {
    maano fact = fact * i
    maano i = i + 1
}

likho "Factorial of " + num + " is " + fact`
            },
            fibonacci: {
                c: `// Fibonacci Sequence
#include <stdio.h>

int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    int terms = 10;
    printf("Fibonacci sequence up to %d terms:\\n", terms);
    for(int i = 0; i < terms; i++) {
        printf("%d ", fibonacci(i));
    }
    printf("\\n");
    return 0;
}`,
                custom: `maano terms = 10
maano a = 0
maano b = 1
maano i = 0
likho "Fibonacci sequence:"
jabtak i < terms {
    likho a
    maano temp = a + b
    maano a = b
    maano b = temp
    maano i = i + 1
}`
            },
            calculator: {
                c: `// Simple Calculator
#include <stdio.h>

int main() {
    float num1, num2, result;
    char operator;
    
    printf("Enter first number: ");
    scanf("%f", &num1);
    printf("Enter operator (+, -, *, /): ");
    scanf(" %c", &operator);
    printf("Enter second number: ");
    scanf("%f", &num2);
    
    switch(operator) {
        case '+':
            result = num1 + num2;
            break;
        case '-':
            result = num1 - num2;
            break;
        case '*':
            result = num1 * num2;
            break;
        case '/':
            if(num2 != 0) {
                result = num1 / num2;
            } else {
                printf("Error: Division by zero!\\n");
                return 1;
            }
            break;
        default:
            printf("Error: Invalid operator!\\n");
            return 1;
    }
    
    printf("Result: %.2f %c %.2f = %.2f\\n", num1, operator, num2, result);
    return 0;
}`,
                custom: `maano num1 = 10
maano num2 = 5
maano operator = "+"

agar operator == "+" {
    likho num1 + num2
} warna {
    likho "Unsupported operator"
}`
            }
        };

        // Simple keyword matching for template selection
        let selectedKey = 'factorial';
        const lowerPrompt = prompt.toLowerCase();
        
        if (lowerPrompt.includes('fibonacci')) {
            selectedKey = 'fibonacci';
        } else if (lowerPrompt.includes('calculator') || lowerPrompt.includes('calculate')) {
            selectedKey = 'calculator';
        }

        const mode = document.getElementById('compilerMode').value;
        const template = templates[selectedKey];
        const app = window.app;

        if (mode === 'both' && app?.editors?.c && app?.editors?.custom) {
            app.editors.c.setValue(template.c);
            app.editors.custom.setValue(template.custom);
            this.showNotification('Generated code from templates for both editors', 'success');
            return;
        }

        const editor = window.currentEditor || app?.editors?.main;
        if (editor) {
            if (mode === 'custom') {
                editor.setValue(template.custom);
            } else {
                editor.setValue(template.c);
            }
            this.showNotification('Generated code from template', 'success');
        }
    }

    startVoiceInput() {
        if (!this.recognition) {
            this.showNotification('Voice recognition not supported in your browser', 'error');
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    showLoading(show) {
        const generateBtn = document.querySelector('[onclick="generateCodeFromPrompt()"]');
        const promptField = document.getElementById('nlPrompt');
        
        if (show) {
            generateBtn.innerHTML = '<span class="loading"></span> Generating...';
            generateBtn.disabled = true;
            promptField.disabled = true;
        } else {
            generateBtn.innerHTML = '<i class="fas fa-bolt mr-2"></i>Generate Code';
            generateBtn.disabled = false;
            promptField.disabled = false;
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-xl shadow-xl z-50 ${type === 'error' ? 'bg-red-500/90' : type === 'warning' ? 'bg-yellow-500/90' : 'bg-green-500/90'} text-white`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-check-circle'} mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Export for global use
window.AIAssistant = AIAssistant;

// Global functions for HTML onclick
function startVoiceInput() {
    if (window.aiAssistant) {
        window.aiAssistant.startVoiceInput();
    }
}

function generateCodeFromPrompt() {
    if (window.aiAssistant) {
        window.aiAssistant.generateCodeFromPrompt();
    }
}