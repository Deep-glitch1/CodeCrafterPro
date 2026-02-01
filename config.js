// config.js
// Configuration for the CodeCrafter Pro Compiler Suite

const CONFIG = {
    // Compiler Settings
    COMPILERS: {
        C: {
            name: "C/C++ Compiler",
            icon: "fa-cog",
            color: "blue",
            defaultCode: `#include <stdio.h>

int main() {
    int x;
    printf("Enter a number: ");
    scanf("%d", &x);
    printf("You entered: %d\\n", x);
    
    // Calculate factorial
    int fact = 1;
    for(int i = 1; i <= x; i++) {
        fact *= i;
    }
    printf("Factorial: %d\\n", fact);
    return 0;
}`
        },
        CUSTOM: {
            name: "Custom Language",
            icon: "fa-magic",
            color: "purple",
            defaultCode: `maano x = 5
maano y = 10
maano sum = x + y

likho "Welcome to CodeCrafter!"
likho "x = " + x
likho "y = " + y
likho "Sum = " + sum

agar x < y {
    likho "x is smaller than y"
} warna {
    likho "x is greater than y"
}

maano i = 1
jabtak i <= 5 {
    likho "Count: " + i
    maano i = i + 1
}`
        }
    },
    
    // AI Settings
    AI: {
        enabled: true,
        apiKey: null, // Set your API key here
        model: "gpt-3.5-turbo",
        maxTokens: 500,
        temperature: 0.7
    },
    
    // Performance Settings
    PERFORMANCE: {
        enableWASM: true,
        cacheResults: true,
        maxExecutionTime: 10000 // 10 seconds
    },
    
    // UI Settings
    UI: {
        theme: "dark",
        fontSize: 14,
        showLineNumbers: true,
        enableAnimations: true,
        autoSave: true
    }
};

// Export for modules
if (typeof module !== 'undefined') {
    module.exports = CONFIG;
}