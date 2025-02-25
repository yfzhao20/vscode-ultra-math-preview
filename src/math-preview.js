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

// State management objects
const PreviewState = {
    decorationArray: [],
    macrosString: "",
    config: {
        macro: null,
        enablePreview: false,
        AutoAdjustPosition: false,
        position: null,
        renderer: null,
        css: ""
    },
    ERROR: {
        occurred: false,
        reset: false
    }
};
// global var
const temp = {
    svgString: null,
    height: null,
    beginInfo: null,
    endInfo: null,
    selections: null
};

// Configuration Manager
const ConfigManager = {
    get(key) {
        return vscode.workspace.getConfiguration(`umath.preview`).get(key);
    },

    updateAll() {
        PreviewState.config = {
            macro: this.get('macros'),
            enablePreview: this.get('enableMathPreview'),
            AutoAdjustPosition: this.get('AutoAdjustPreviewPosition'),
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
            'AutoAdjustPreviewPosition': 'AutoAdjustPosition',
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

// Macro processors
const MacroProcessor = {
    update(document) {
        PreviewState.macrosString = getMacros(document, PreviewState.config.macro)?.join('\n') ?? "";
    }
};

// Event Processor
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
            temp.selections = e.selections
        }
    },

    onVisibleRangesChange() {
        if (PreviewState.config.AutoAdjustPosition && temp.svgString) {
            reLocatingPreview(temp.svgString);
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

const defaultCSS = {
    maxheight: 'max-height: 45em;',
    OtherCSS: 'position: absolute;\
        padding: 0.5em;\
        display: inline-block;\
        z-index: 1;\
        pointer-events: auto;\
        background-color: var(--vscode-editor-background);\
        border: 0.5px solid var(--vscode-editorWidget-border);'
};
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
    // Initialize the configuration
    ConfigManager.updateAll();
    MacroProcessor.update(vscode.window.activeTextEditor?.document);

    // Register the command
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

    // Register for an event listener
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(EventHandlers.onActiveEditorChange),
        vscode.window.onDidChangeTextEditorSelection(
            EventHandlers.withPreviewCheck(EventHandlers.onSelectionChange)
        ),
        vscode.window.onDidChangeTextEditorVisibleRanges(
            EventHandlers.withPreviewCheck(EventHandlers.onVisibleRangesChange)
        ),
        vscode.workspace.onDidChangeConfiguration((e) => { ConfigManager.handleConfigChange(e) })
    );
}


let renderTimeout_setPreview;
const RENDER_DEBOUNCE_setPreview = 50; // 50ms
// Added rendering request stabilization
function setPreview(document, position) {
    clearTimeout(renderTimeout_setPreview);
    renderTimeout_setPreview = setTimeout(
        () => _setPreview(document, position), RENDER_DEBOUNCE_setPreview);
}

// A collection of utility functions
const PreviewUtils = {
    // Obtain the configuration item
    getConfig(section, key, defaultValue) {
        return vscode.workspace.getConfiguration(section).get(key) ?? defaultValue;
    },

    // Calculate the cutting range
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

    // Work with mathematical expression content
    processMathContent(mathExpression, testScope) {
        if (testScope.isDisplayMath && testScope.scope.includes("quote")) {
            return mathExpression.replace(MATH_REPLACE_REGEX.blockquote, "");
        }
        return mathExpression;
    },

    // Calculate the preview position
    calculatePreviewPosition(lineHeightConfig, height, visibleRanges, configPosition, beginInfo, endInfo) {
        const lineHeight = Math.ceil(height / lineHeightConfig);
        const Isbottom = Boolean(configPosition === 'bottom');
        const candidate = Isbottom ? endInfo.insertPosition.line
            : beginInfo.insertPosition.line;

        return Math.min(
            Math.max(candidate, Isbottom ? visibleRanges.start.line + 1
                : visibleRanges.start.line + lineHeight),
            Isbottom ? visibleRanges.end.line - lineHeight : visibleRanges.end.line
        );
    }
};

// Height calculator
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
        return getMaxHeightValueAndUnit(defaultCSS.maxheight + defaultCSS.OtherCSS + css);
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

/**
 * MAIN
 * @param {vscode.TextDocument} document 
 * @param {vscode.Position} position 
 * @returns 
 */
async function _setPreview(document, position) {
    // Pre-confirmation
    clearPreview();
    if (!document || !position || PreviewState.ERROR.occurred) return;

    // Get math ranges
    const testScope = getCachedMathScope(document, position);
    if (!isValidMathScope(testScope)) return;

    // Parse mathematical expressions
    const { mathExpression, isDisplayMath, beginInfo, endInfo } = processMathExpression(document, testScope, position);
    if (!mathExpression || mathExpression.match(MATH_REPLACE_REGEX.blankFormula)) return;

    // Calculate the preview height
    const height = await HeightCalculator.getRenderHeight(
        PreviewState.macrosString + mathExpression,
        isDisplayMath,
        PreviewState.config.renderer
    );
    if (!height) return;

    // Render the preview and set the position
    const lineHeight = PreviewUtils.getConfig('editor', 'lineHeight', 0);
    const lineHeightConfig = lineHeight === 0 ? 1.2 : lineHeight;// workspace config
    const visibleRanges = vscode.window.activeTextEditor.visibleRanges[0];
    const instLine = PreviewUtils.calculatePreviewPosition(
        lineHeightConfig,
        height,
        visibleRanges,
        PreviewState.config.position,
        beginInfo,
        endInfo
    );

    finalizePreview(mathExpression, isDisplayMath, instLine, endInfo);

    temp.height = height;
    temp.beginInfo = beginInfo;
    temp.endInfo = endInfo;
}

// Supporting method
function isValidMathScope(scope) {
    return scope && !scope.isInBeginDelimiter && !scope.isInEndDelimiter;
}

function processMathExpression(document, testScope, position) {
    const beginMath = getBegin(testScope.scope.includes('meta.math.block'), testScope.isDisplayMath);
    const endMath = getEnd(testScope.scope.includes('meta.math.block'), testScope.isDisplayMath);

    const beginInfo = jumpToBeginPosition(document, position, beginMath);
    const endInfo = jumpToEndPosition(document, position, endMath);

    const mathRange = PreviewUtils.calculateMathCutRange(beginInfo, endInfo);
    let mathExpression = document.getText(mathRange);

    return {
        mathExpression: PreviewUtils.processMathContent(mathExpression, testScope),
        isDisplayMath: testScope.isDisplayMath,
        beginInfo,
        endInfo
    };
}

function finalizePreview(expression, isDisplayMath, line, endInfo) {
    const charPos = endInfo.insertPosition.character - (endInfo.match?.matchStr?.length ?? 0);
    const previewPosition = new vscode.Position(line, charPos);
    pushPreview(expression, isDisplayMath, previewPosition);
}


// Caches the most recent scoping results
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
            temp.svgString = svgString;
            // set when clause
            vscode.commands.executeCommand('setContext', 'umathShowPreview', true)
            PreviewState.decorationArray.push(mathPreview)
            vscode.window.activeTextEditor.setDecorations(mathPreview, [new vscode.Range(previewPosition, previewPosition)])
        })
        .catch((err) => {
            console.log(err.message);
            if (PreviewState.ERROR.occurred) {
                PreviewState.ERROR.occurred = false;
                PreviewState.ERROR.reset = false;
            }
            else {
                console.log("retry");
                PreviewState.ERROR.reset = true;
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

    const CSSstring =
        // Info: Text and preview SVG are positioned in reverseshow.
        `content: url('data:image/svg+xml;utf8,${mathString}');\
        ${PreviewState.config.position === 'top' ? 'bottom' : 'top'}: 1.15em;`
        + defaultCSS.maxheight + defaultCSS.OtherCSS + PreviewState.config.css

    return vscode.window.createTextEditorDecorationType({
        before: {
            contentText: '',
            textDecoration: `none; ${CSSstring} `,
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

let renderTimeout_reLocatingPreview;
const RENDER_DEBOUNCE_reLocatingPreview = 50; // 50ms
// Added rendering request stabilization
function reLocatingPreview(svgString) {
    clearTimeout(renderTimeout_reLocatingPreview);
    renderTimeout_reLocatingPreview = setTimeout(
        () => _reLocatingPreview(svgString), RENDER_DEBOUNCE_reLocatingPreview);
}
async function _reLocatingPreview(svgString) {
    clearPreview();
    if (!svgString || PreviewState.ERROR.occurred) return;

    // get the global var
    const height = temp.height;
    const beginInfo = temp.beginInfo;
    const endInfo = temp.endInfo;

    // Render the preview and set the position
    const lineHeight = PreviewUtils.getConfig('editor', 'lineHeight', 0);
    const lineHeightConfig = lineHeight === 0 ? 1.2 : lineHeight;
    const visibleRanges = vscode.window.activeTextEditor.visibleRanges[0];
    const instLine = PreviewUtils.calculatePreviewPosition(
        lineHeightConfig,
        height,
        visibleRanges,
        PreviewState.config.position,
        beginInfo,
        endInfo
    );

    const charPos = endInfo.insertPosition.character - (endInfo.match?.matchStr?.length ?? 0);
    const previewPosition = new vscode.Position(instLine, charPos);

    let mathPreview = createPreview(svgString)
    vscode.commands.executeCommand('setContext', 'umathShowPreview', true)
    PreviewState.decorationArray.push(mathPreview)
    vscode.window.activeTextEditor.setDecorations(mathPreview, [new vscode.Range(previewPosition, previewPosition)])
}

/////////////////////////////////////////////////////////

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