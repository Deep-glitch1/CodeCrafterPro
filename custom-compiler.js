class ASTVisualizer {
    constructor(options = {}) {
        this.childProperties = options.childProperties || [
            'body',
            'statements',
            'then',
            'else',
            'condition',
            'initializer',
            'value',
            'left',
            'right',
            'argument',
            'target'
        ];
    }

    visualize(node) {
        if (!node || typeof node !== 'object') return '';
        const lines = [];
        this.walk({ label: null, node }, '', true, 0, lines);
        return lines.join('\n');
    }

    walk(entry, prefix, isLast, depth, lines) {
        const connector = depth === 0 ? '' : (isLast ? '+-- ' : '|-- ');
        const label = entry.label ? `${entry.label}: ` : '';
        lines.push(prefix + connector + label + this.formatNode(entry.node));

        const children = this.getChildren(entry.node);
        const nextPrefix = depth === 0
            ? ''
            : prefix + (isLast ? '    ' : '|   ');

        children.forEach((child, index) => {
            this.walk(child, nextPrefix, index === children.length - 1, depth + 1, lines);
        });
    }

    formatNode(node) {
        let label = node.type || 'Unknown';

        if (node.value !== undefined) {
            label += `: ${JSON.stringify(node.value)}`;
        }
        if (node.name) {
            label += ` (${node.name})`;
        }
        if (node.operator) {
            label += ` [operator: ${node.operator}]`;
        }

        return label;
    }

    getChildren(node) {
        const children = [];

        this.childProperties.forEach(prop => {
            const value = node[prop];
            if (!value) return;

            if (Array.isArray(value)) {
                value.forEach((child, index) => {
                    if (child && typeof child === 'object') {
                        children.push({ label: `${prop}[${index}]`, node: child });
                    }
                });
                return;
            }

            if (typeof value === 'object') {
                children.push({ label: prop, node: value });
            }
        });

        return children;
    }
}

class IRGenerator {
    generate(ast) {
        this.instructions = [];
        this.tempCount = 0;
        this.labelCount = 0;
        this.visitNode(ast);
        return this.instructions;
    }

    visitNode(node) {
        if (!node) return null;

        switch (node.type) {
            case 'Program':
                node.body.forEach(stmt => this.visitNode(stmt));
                return null;

            case 'Block':
                node.statements.forEach(stmt => this.visitNode(stmt));
                return null;

            case 'VariableDeclaration': {
                const valueTemp = node.initializer ? this.visitNode(node.initializer) : this.emitConst(0);
                this.instructions.push({ op: 'assign', dest: node.name, src1: valueTemp });
                return node.name;
            }

            case 'Assignment': {
                const valueTemp = this.visitNode(node.value);
                this.instructions.push({ op: 'assign', dest: node.name, src1: valueTemp });
                return node.name;
            }

            case 'AssignmentExpression': {
                const valueTemp = this.visitNode(node.value);
                if (node.target?.type === 'Variable') {
                    this.instructions.push({ op: 'assign', dest: node.target.name, src1: valueTemp });
                    return node.target.name;
                }
                return valueTemp;
            }

            case 'PrintStatement': {
                const valueTemp = this.visitNode(node.value);
                this.instructions.push({ op: 'print', src1: valueTemp });
                return null;
            }

            case 'ExpressionStatement':
                this.visitNode(node.expression);
                return null;

            case 'IfStatement': {
                const condTemp = this.visitNode(node.condition);
                const elseLabel = this.newLabel('else');
                const endLabel = this.newLabel('endif');

                this.instructions.push({ op: 'if_false', src1: condTemp, target: elseLabel });
                this.visitNode(node.then);
                this.instructions.push({ op: 'goto', target: endLabel });
                this.instructions.push({ op: 'label', name: elseLabel });
                if (node.else) {
                    this.visitNode(node.else);
                }
                this.instructions.push({ op: 'label', name: endLabel });
                return null;
            }

            case 'WhileStatement': {
                const startLabel = this.newLabel('while');
                const endLabel = this.newLabel('endwhile');

                this.instructions.push({ op: 'label', name: startLabel });
                const condTemp = this.visitNode(node.condition);
                this.instructions.push({ op: 'if_false', src1: condTemp, target: endLabel });
                this.visitNode(node.body);
                this.instructions.push({ op: 'goto', target: startLabel });
                this.instructions.push({ op: 'label', name: endLabel });
                return null;
            }

            case 'BinaryExpression':
            case 'LogicalExpression': {
                const leftTemp = this.visitNode(node.left);
                const rightTemp = this.visitNode(node.right);
                const resultTemp = this.newTemp();
                this.instructions.push({ op: node.operator, dest: resultTemp, src1: leftTemp, src2: rightTemp });
                return resultTemp;
            }

            case 'UnaryExpression': {
                const argTemp = this.visitNode(node.argument);
                const resultTemp = this.newTemp();
                this.instructions.push({ op: node.operator, dest: resultTemp, src1: argTemp });
                return resultTemp;
            }

            case 'Literal':
                return this.emitConst(node.value);

            case 'Variable':
                return node.name;

            default:
                return null;
        }
    }

    emitConst(value) {
        const temp = this.newTemp();
        this.instructions.push({ op: 'const', dest: temp, value });
        return temp;
    }

    newTemp() {
        return `t${this.tempCount++}`;
    }

    newLabel(prefix) {
        return `${prefix}_${this.labelCount++}`;
    }
}

class CustomLanguageCompiler {
    constructor(options = {}) {
        const config = options.keywords || (typeof CONFIG !== 'undefined' ? CONFIG.CUSTOM_KEYWORDS : null);
        this.setKeywords(config);
        this.astVisualizer = new ASTVisualizer();
        this.irGenerator = new IRGenerator();
    }

    setKeywords(keywordConfig = null) {
        const defaults = {
            declare: 'maano',
            print: 'likho',
            if: 'agar',
            else: 'warna',
            while: 'jabtak'
        };
        this.keywordConfig = { ...defaults, ...(keywordConfig || {}) };
        this.lexerImpl = new ManualLexer(this.keywordConfig);
    }

    lexer(code) {
        return this.lexerImpl.tokenize(code);
    }

    parser(tokens) {
        const parser = new ManualParser(tokens);
        return parser.parse();
    }

    compile(code, options = {}) {
        const timing = { lexer: 0, parser: 0, ir: 0, interpret: 0 };
        try {
            const lexerStart = performance.now();
            const tokens = this.lexer(code);
            timing.lexer = performance.now() - lexerStart;

            const parserStart = performance.now();
            const ast = this.parser(tokens);
            timing.parser = performance.now() - parserStart;

            const irStart = performance.now();
            const ir = this.irGenerator.generate(ast);
            timing.ir = performance.now() - irStart;

            const interpretStart = performance.now();
            const runtime = new RealTimeCompiler(this.keywordConfig);
            
            const output = runtime.compile(ast); 
            timing.interpret = performance.now() - interpretStart;

            // Format AST as tree for hierarchical display
            let astTree = '';
            try {
                const astBuilder = new GenericASTBuilder();
                astTree = astBuilder.formatAsTree(ast);
            } catch (e) {
                console.warn('⚠️ Could not format AST as tree:', e.message);
                astTree = this.formatAST(ast); // Fallback to old format
            }

            return {
                success: true,
                tokens,
                ast,
                ir,
                output,
                timing,
                warnings: [],
                astTree: astTree
            };
        } catch (error) {
            const errorDetails = this.extractErrorDetails(error);
            const message = error?.message || 'Compilation failed.';
            return {
                success: false,
                error: message,
                errorDetails,
                output: `Compilation Error: ${message}`,
                timing
            };
        }
    }

    formatTokens(tokens = []) {
        return tokens.map((token, i) => {
            return `${i + 1}. ${token.type} "${token.value}" (line ${token.line}, col ${token.column})`;
        }).join('\n');
    }

    formatAST(node) {
        return this.astVisualizer.visualize(node);
    }

    formatIR(instructions = []) {
        if (!instructions.length) return 'IR is empty.';
        return instructions.map((inst, index) => {
            if (inst.op === 'label') {
                return `${index + 1}. ${inst.name}:`;
            }
            if (inst.op === 'goto') {
                return `${index + 1}. goto ${inst.target}`;
            }
            if (inst.op === 'if_false') {
                return `${index + 1}. if_false ${inst.src1} goto ${inst.target}`;
            }
            if (inst.op === 'print') {
                return `${index + 1}. print ${inst.src1}`;
            }
            if (inst.op === 'const') {
                return `${index + 1}. ${inst.dest} = ${JSON.stringify(inst.value)}`;
            }
            if (inst.op === 'assign') {
                return `${index + 1}. ${inst.dest} = ${inst.src1}`;
            }
            if (inst.src2 !== undefined) {
                return `${index + 1}. ${inst.dest} = ${inst.src1} ${inst.op} ${inst.src2}`;
            }
            return `${index + 1}. ${inst.dest} = ${inst.op} ${inst.src1}`;
        }).join('\n');
    }

    extractErrorDetails(error) {
        if (!error) return null;
        if (typeof error === 'object' && (error.line || error.column)) {
            return {
                line: error.line || 1,
                column: error.column || 1
            };
        }

        const message = error.message || '';
        const match = message.match(/line\s+(\d+),\s*column\s+(\d+)/i);
        if (match) {
            return {
                line: Number(match[1]),
                column: Number(match[2])
            };
        }

        return null;
    }
}