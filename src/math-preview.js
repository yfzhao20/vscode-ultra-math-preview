"use strict";

const vscode = require('vscode')
const { getMacros } = require('./get-macros')
const texRenderer = require('./texRenderer')
const { getMathScope } = require('./util/get-scopes')
const {
    getMaxHeightValueAndUnit,
    renderAndGetHeightInEm
} = require('./util/autoPreviewPosition');
const { jumpToBeginPosition, jumpToEndPosition, getBegin, getEnd } = require('./util/get-delimiter-position')

// 状态管理对象
const PreviewState = {
    decorationArray: [],
    macrosString: "",
    config: {
        macro: null,
        enablePreview: false,
        autoAdjustPosition: false,
        position: null,
        renderer: null,
        css: ""
    },
    tempEditor: null,
    error: { occurred: false, reset: false }
};

// 配置管理器
const ConfigManager = {
    get(key) {
        return vscode.workspace.getConfiguration(`umath.preview`).get(key);
    },

    updateAll() {
        PreviewState.config = {
            macro: this.get('macros'),
            enablePreview: this.get('enableMathPreview'),
            autoAdjustPosition: this.get('AutoAdjustPreviewPosition'),
            position: this.get('position'),
            renderer: this.get('renderer'),
            css: this.get('customCSS')?.join('') || ""
        };
    },

    handleConfigChange(event) {
        if (!event) return;

        const configMap = {
            'macros': 'macro',
            'enableMathPreview': 'enablePreview',
            'AutoAdjustPreviewPosition': 'autoAdjustPosition',
            'position': 'position',
            'renderer': 'renderer',
            'customCSS': 'css'
        };

        Object.entries(configMap).forEach(([key, prop]) => {
            if (event.affectsConfiguration(`umath.preview.${key}`)) {
                PreviewState.config[prop] = key === 'customCSS'
                    ? this.get(key)?.join('') || ""
                    : this.get(key);
            }
        });

        if (!PreviewState.config.enablePreview) {
            clearPreview();
        }
    }
};

// 宏处理器
const MacroProcessor = {
    update(document) {
        PreviewState.macrosString = getMacros(document, PreviewState.config.macro)?.join('\n') ?? "";
    }
};

// 事件处理器
const EventHandlers = {
    withPreviewCheck(handler) {
        return (...args) => PreviewState.config.enablePreview && handler(...args);
    },

    onActiveEditorChange(e) {
        if (e) MacroProcessor.update(e.document);
    },

    onSelectionChange(e) {
        if (e) {
            setPreview(e.textEditor.document, e.selections[0]?.active);
            PreviewState.tempEditor = e;
        }
    },

    onVisibleRangesChange() {
        if (PreviewState.config.autoAdjustPosition && PreviewState.tempEditor) {
            setPreview(
                PreviewState.tempEditor.textEditor.document,
                PreviewState.tempEditor.selections[0]?.active
            );
        }
    }
};

const Commands = [
    ['umath.preview.closeAllPreview', clearPreview],
    ['umath.preview.reloadMacros', reloadMacros],
    ['umath.preview.toggleMathPreview', toggleMathPreview],
    ['umath.preview.reloadPreview', () => {
        const editor = vscode.window.activeTextEditor;
        setPreview(editor?.document, editor?.selection?.active);
    }]
];

// handle MathJax error. Reload on error once.
let onError = false;
let resetError = false;
let Height;

const defaultMaxHeight = 'max-height: 45em;'
// Compile regular expressions in advance
// in function createPreview
const SVG_REPLACE_REGEX = {
    style: /(?<=style\s*=\s*)"/,
    container: /<mjx-container[^<]*><svg/,
    endContainer: /<\/mjx-container>/
};
// in function _setPreview
const MATH_REPLACE_REGEX = {
    delimiter: /\$\$|\$|\\\[|\\\(|\\begin\{math\}|\\begin\{displaymath\}/,
    blankFormula: /^\s*$/,
    blockquote: /[\n\r]([ \s]*>)+/g,
};

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    // 初始化配置
    ConfigManager.updateAll();
    MacroProcessor.update(vscode.window.activeTextEditor?.document);

    // 注册命令（带预览检查）
    context.subscriptions.push(
        ...Commands.map(([name, handler]) =>
            vscode.commands.registerCommand(
                name,
                name.includes('reloadPreview')
                    ? EventHandlers.withPreviewCheck(handler)
                    : handler
            )
        )
    );

    // 注册事件监听（带预览检查）
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(EventHandlers.onActiveEditorChange),
        vscode.window.onDidChangeTextEditorSelection(
            EventHandlers.withPreviewCheck(EventHandlers.onSelectionChange)
        ),
        vscode.window.onDidChangeTextEditorVisibleRanges(
            EventHandlers.withPreviewCheck(EventHandlers.onVisibleRangesChange)
        ),
        vscode.workspace.onDidChangeConfiguration(ConfigManager.handleConfigChange)
    );
}
/** 
function activate(context) {
    macrosString = getMacros(vscode.window?.activeTextEditor?.document, macroConfig)?.join('\n') ?? ""
    enablePreview = vscode.workspace.getConfiguration().get('umath.preview.enableMathPreview')

    context.subscriptions.push(
        vscode.commands.registerCommand('umath.preview.closeAllPreview', clearPreview),
        vscode.commands.registerCommand('umath.preview.reloadMacros', reloadMacros),
        vscode.commands.registerCommand('umath.preview.toggleMathPreview', toggleMathPreview),
        vscode.commands.registerCommand('umath.preview.reloadPreview', () => {
            if (!enablePreview)
                return;
            const editor = vscode?.window?.activeTextEditor;
            setPreview(editor?.document, editor?.selection?.active);
        }),

        vscode.window.onDidChangeActiveTextEditor((e) => { enablePreview && e && (macrosString = getMacros(e?.document, macroConfig)?.join('\n') ?? "") }),
        vscode.window.onDidChangeTextEditorSelection((e) => {
            enablePreview && e && setPreview(e?.textEditor?.document, e?.selections[0]?.active);
            e_temp = e;
        }),
        vscode.window.onDidChangeTextEditorVisibleRanges((e) => {
            enablePreview && IsAutoAdjustPosi && e && setPreview(e_temp?.textEditor?.document, e_temp?.selections[0]?.active)
        }),

        vscode.workspace.onDidChangeConfiguration((e) => {
            e && e.affectsConfiguration("umath.preview.macros") && (macroConfig = vscode.workspace.getConfiguration().get("umath.preview.macros"));
            e && e.affectsConfiguration("umath.preview.position") && (positionConfig = vscode.workspace.getConfiguration().get('umath.preview.position'));
            e && e.affectsConfiguration("umath.preview.AutoAdjustPreviewPosition") && (positionConfig = vscode.workspace.getConfiguration().get('umath.preview.AutoAdjustPreviewPosition'));
            e && e.affectsConfiguration("umath.preview.renderer") && (rendererConfig = vscode.workspace.getConfiguration().get('umath.preview.renderer'));
            e && e.affectsConfiguration("umath.preview.enableMathPreview") && (enablePreview = vscode.workspace.getConfiguration().get('umath.preview.enableMathPreview'));
            e && e.affectsConfiguration("umath.preview.customCSS") && (cssConfig = vscode.workspace.getConfiguration().get('umath.preview.customCSS')?.join(''));
            !enablePreview && clearPreview();
        }),
    )
}*/


let renderTimeout;
const RENDER_DEBOUNCE = 50; // 50ms
// Added rendering request stabilization
function setPreview(document, position) {
    clearTimeout(renderTimeout);
    renderTimeout = setTimeout(() => _setPreview(document, position), RENDER_DEBOUNCE);
}

/**
 * MAIN
 * @param {vscode.TextDocument} document 
 * @param {vscode.Position} position 
 * @returns 
 */

/** 
async function _setPreview(document, position) {
    clearPreview()
    if (!document || !position) return;

    // handle error
    if (onError) {
        resetError && (onError = !onError)
        resetError = !resetError
    }

    const testScope = getCachedMathScope(document, position);
    // exclude (not math environment) or (in math delimiter)
    if (!testScope || testScope.isInBeginDelimiter || testScope.isInEndDelimiter) return;

    // isLatex: scope.includes('meta.math.block')
    const beginMath = getBegin(testScope.scope.includes('meta.math.block'), testScope.isDisplayMath)
    const endMath = getEnd(testScope.scope.includes('meta.math.block'), testScope.isDisplayMath)
    const beginInfo = jumpToBeginPosition(document, position, beginMath)
    const endInfo = jumpToEndPosition(document, position, endMath)

    // cut some delimiters
    const cutBegin = beginInfo.match?.matchStr?.match(MATH_REPLACE_REGEX.delimiter)?.[0]?.length ?? 0
    const cutEnd = (endInfo.match ? (cutBegin > 2 ? cutBegin - 2 : cutBegin) : 0)  // 'begin' => 'end'
    const mathRange = new vscode.Range(
        beginInfo.insertPosition.line,
        beginInfo.insertPosition.character + cutBegin,
        endInfo.insertPosition.line,
        endInfo.insertPosition.character - cutEnd
    )
    let mathExpression = document.getText(mathRange);

    // don't render blank formula
    if (mathExpression.match(MATH_REPLACE_REGEX.blankFormula)) return;

    // get rid of "blockquote" & "list"
    if (testScope.isDisplayMath && testScope.scope.indexOf("quote") !== -1)
        mathExpression = mathExpression.replace(MATH_REPLACE_REGEX.blockquote, "")

    // push macros
    mathExpression = PreviewState.macrosString + mathExpression;

    // set preview position
    const visibleRanges = vscode.window.activeTextEditor.visibleRanges[0];
    const StartLine = visibleRanges.start.line;
    const EndLine = visibleRanges.end.line;


    // get vscode workspace line height Configuration
    let lineHeightConfig = vscode.workspace.getConfiguration('editor').get('lineHeight');

    if (lineHeightConfig === 0 || lineHeightConfig === undefined || lineHeightConfig === null) {
        lineHeightConfig = 1.2;
    }// vscode line height default settings

    const { MaxHeightValue, Unit } = getMaxHeightValueAndUnit(defaultMaxHeight + PreviewState.config.css);

    renderAndGetHeightInEm(
        mathExpression,
        testScope.isDisplayMath,
        texRenderer,
        PreviewState.config.renderer
    ).then(height => {
        if (height == 'undefined') return

        // Unit only supports 'em' and 'px'
        if (Unit == 'em') {
            Height = Math.min(MaxHeightValue, height);
        } else if (Unit == 'px') {
            const fontSize = vscode.workspace.getConfiguration('editor').get('fontSize');
            Height = Math.min(MaxHeightValue / fontSize, height);
        } else {
            console.log('Units are not matched')
            Height = 30;
        }
    }).catch(error => {
        console.error("Error rendering SVG:", error);
    })

    const lineHeight = Math.ceil(Height / lineHeightConfig);

    // ensure that the InstLine is within the current visible range
    const candidate = PreviewState.config.position === 'bottom'
        ? endInfo.insertPosition.line
        : beginInfo.insertPosition.line - lineHeight;

    const lowerBound = StartLine + 1;
    const upperBound = EndLine - lineHeight;

    const InstLine = Math.min(Math.max(candidate, lowerBound), upperBound);

    const previewPosition = new vscode.Position(InstLine, endInfo.insertPosition.character - endInfo.match?.matchStr?.length ?? 0);
    pushPreview(mathExpression, testScope.isDisplayMath, previewPosition);
}
*/

// 工具函数集合
const PreviewUtils = {
    // 获取配置项
    getConfig(section, key, defaultValue) {
        return vscode.workspace.getConfiguration(section).get(key) ?? defaultValue;
    },

    // 计算切割范围
    calculateMathCutRange(beginInfo, endInfo) {
        const cutBegin = beginInfo.match?.matchStr?.match(MATH_REPLACE_REGEX.delimiter)?.[0]?.length ?? 0;
        const cutEnd = endInfo.match ? (cutBegin > 2 ? cutBegin - 2 : cutBegin) : 0;
        return new vscode.Range(
            beginInfo.insertPosition.line,
            beginInfo.insertPosition.character + cutBegin,
            endInfo.insertPosition.line,
            endInfo.insertPosition.character - cutEnd
        );
    },

    // 处理数学表达式内容
    processMathContent(mathExpression, testScope) {
        if (testScope.isDisplayMath && testScope.scope.includes("quote")) {
            return mathExpression.replace(MATH_REPLACE_REGEX.blockquote, "");
        }
        return mathExpression;
    },

    // 计算预览位置
    calculatePreviewPosition(lineHeightConfig, height, visibleRanges, configPosition, endInfo) {
        const lineHeight = Math.ceil(height / lineHeightConfig);
        const candidate = configPosition === 'bottom'
            ? endInfo.insertPosition.line
            : endInfo.insertPosition.line - lineHeight;

        return Math.min(
            Math.max(candidate, visibleRanges.start.line + 1),
            visibleRanges.end.line - lineHeight
        );
    }
};

// 高度计算器
class HeightCalculator {
    static async getRenderHeight(mathExpression, isDisplayMath, renderer) {
        try {
            const height = await renderAndGetHeightInEm(
                mathExpression,
                isDisplayMath,
                texRenderer,
                renderer
            );

            if (typeof height === 'undefined') return null;

            const { MaxHeightValue, Unit } = this.parseMaxHeight();
            return this.convertHeightUnit(height, MaxHeightValue, Unit);
        } catch (error) {
            console.error("Render error:", error);
            return null;
        }
    }

    static parseMaxHeight() {
        const css = PreviewState.config.css || '';
        return getMaxHeightValueAndUnit(defaultMaxHeight + css);
    }

    static convertHeightUnit(height, maxValue, unit) {
        const converters = {
            'em': () => Math.min(maxValue, height),
            'px': () => {
                const fontSize = PreviewUtils.getConfig('editor', 'fontSize', 14);
                return Math.min(maxValue / fontSize, height);
            },
            default: () => 30
        };

        return (converters[unit] || converters.default)();
    }
}

async function _setPreview(document, position) {
    // 前置检查
    clearPreview();
    if (!document || !position || PreviewState.error.occurred) return;

    // 获取数学范围
    const testScope = getCachedMathScope(document, position);
    if (!isValidMathScope(testScope)) return;

    // 解析数学表达式
    const { mathExpression, isDisplayMath,endInfo } = processMathExpression(document, testScope,position);
    if (!mathExpression || mathExpression.match(MATH_REPLACE_REGEX.blankFormula)) return;

    // 计算预览高度
    const height = await HeightCalculator.getRenderHeight(
        PreviewState.macrosString + mathExpression,
        isDisplayMath,
        PreviewState.config.renderer
    );
    if (!height) return;

    // 计算并设置预览位置
    const lineHeight = PreviewUtils.getConfig('editor', 'lineHeight', 0);
    const lineHeightConfig = lineHeight === 0 ? 1.2 : lineHeight;
    const visibleRanges = vscode.window.activeTextEditor.visibleRanges[0];
    const instLine = PreviewUtils.calculatePreviewPosition(
        lineHeightConfig,
        height,
        visibleRanges,
        PreviewState.config.position,
        endInfo
    );

    finalizePreview(mathExpression, isDisplayMath, instLine, endInfo);
}

// 辅助方法
function isValidMathScope(scope) {
    return scope && !scope.isInBeginDelimiter && !scope.isInEndDelimiter;
}

function processMathExpression(document, testScope,position) {
    const beginMath = getBegin(testScope.scope.includes('meta.math.block'), testScope.isDisplayMath);
    const endMath = getEnd(testScope.scope.includes('meta.math.block'), testScope.isDisplayMath);

    const beginInfo = jumpToBeginPosition(document, position, beginMath);
    const endInfo = jumpToEndPosition(document, position, endMath);

    const mathRange = PreviewUtils.calculateMathCutRange(beginInfo, endInfo);
    let mathExpression = document.getText(mathRange);

    return {
        mathExpression: PreviewUtils.processMathContent(mathExpression, testScope),
        isDisplayMath: testScope.isDisplayMath,
        endInfo
    };
}

function finalizePreview(expression, isDisplayMath, line, endInfo) {
    const charPos = endInfo.insertPosition.character - (endInfo.match?.matchStr?.length ?? 0);
    const previewPosition = new vscode.Position(line, charPos);
    pushPreview(expression, isDisplayMath, previewPosition);
}


// 缓存最近的作用域计算结果
let lastScopeCache = null;
function getCachedMathScope(document, position) {
    const key = `${document.uri.toString()}:${position.line}:${position.character}`;
    if (!lastScopeCache || lastScopeCache.key !== key) {
        lastScopeCache = {
            key,
            value: getMathScope(document, position)
        };
    }
    return lastScopeCache.value;
}

/**
 * render and push math preview
 * @param {string} mathExpression 
 * @param {boolean} isBlock 
 * @param {vscode.Position} previewPosition 
 */
function pushPreview(mathExpression, isBlock, previewPosition) {
    texRenderer[PreviewState.config.renderer](mathExpression, isBlock)
        .then((svgString) => {
            // exclude error case
            if (svgString.includes("error"))
                return
            // create preview panel
            let mathPreview = createPreview(svgString)
            // set when clause
            vscode.commands.executeCommand('setContext', 'umathShowPreview', true)
            PreviewState.decorationArray.push(mathPreview)
            vscode.window.activeTextEditor.setDecorations(mathPreview, [new vscode.Range(previewPosition, previewPosition)])
        })
        .catch((err) => {
            console.log(err.message);
            if (onError) {
                onError = false;
                resetError = false;
            }
            else {
                console.log("retry");
                onError = true;
                const editor = vscode?.window?.activeTextEditor;
                setPreview(editor?.document, editor?.selection?.active);
            }
        });
}

/**
 * process svg string and create preview panel
 * @param {string} mathString 
 * @returns {vscode.TextEditorDecorationType} 
 */
function createPreview(mathString) {
    mathString = mathString
        .replace(SVG_REPLACE_REGEX.style, `"color:${getThemeColor()};`)
        .split("#").join('%23')
        .replace(SVG_REPLACE_REGEX.container, "<svg")
        .replace(SVG_REPLACE_REGEX.endContainer, "");

    const defaultCss =
        // Info: Text and preview SVG are positioned in reverseshow.
        `content: url('data:image/svg+xml;utf8,${mathString}');\
        position: absolute;\
        padding: 0.5em;\
        ${PreviewState.config.position === 'top' ? 'bottom' : 'top'}: 1.15em;\
        display: inline-block;\
        z-index: 1;\
        pointer-events: auto;\
        background-color: var(--vscode-editor-background);\
        border: 0.5px solid var(--vscode-editorWidget-border);`
        + defaultMaxHeight + PreviewState.config.css

    return vscode.window.createTextEditorDecorationType({
        before: {
            contentText: '',
            textDecoration: `none; ${defaultCss} `,
        },
        textDecoration: `none; position: relative;`,
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    })
}

// Color caching
let themeColorCache = '';
function getThemeColor() {
    if (!themeColorCache) {
        themeColorCache = (vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ||
            vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast)
            ? '#fff' : '#111';//  Dark || HC Dark
    }
    return themeColorCache;
}

/////////////////////////////////////////////////////////

/**
function clearPreview() {
    for (let thisDeco of decorationArray)
        thisDeco.dispose()
    decorationArray.length = 0;
    vscode.commands.executeCommand('setContext', 'umathShowPreview', false)
}*/

function clearPreview() {
    PreviewState.decorationArray.forEach(decoration => {
        vscode.window.activeTextEditor?.setDecorations(decoration, []);
    });
    PreviewState.decorationArray = []; 
}

/////////////////////////////////////////////////////////

function reloadMacros() {
    if (!PreviewState.config.enablePreview)
        return;
    macroConfig = vscode.workspace.getConfiguration().get('umath.preview.macros')
    const editor = vscode.window?.activeTextEditor;
    PreviewState.macrosString = getMacros(editor?.document, macroConfig)?.join('\n') ?? ""
    setPreview(editor?.document, editor?.selection?.active);
}

function toggleMathPreview() {
    vscode.workspace.getConfiguration().update('umath.preview.enableMathPreview', !PreviewState.config.enablePreview, true)
    PreviewState.config.enablePreview = !PreviewState.config.enablePreview
    clearPreview();
    if (!PreviewState.config.enablePreview)
        return;
    const editor = vscode?.window?.activeTextEditor;
    PreviewState.macrosString = getMacros(editor?.document, macroConfig)?.join('\n') ?? ""
    setPreview(editor?.document, editor?.selection?.active);
}

module.exports = {
    activate
}