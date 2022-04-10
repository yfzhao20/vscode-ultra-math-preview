"use strict";

const vscode = require('vscode')
const {getMacros} = require('./get-macros')
const texRenderer = require('./texRenderer')
const {getMathScope} = require('./util/get-scopes')
const {
    jumpToBeginPosition,
    jumpToEndPosition,
    getMathRange,
    getBegin,
    getEnd
} = require('./util/get-delimiter-position')

// init
let decorationArray = [];
let macrosArray = [];
let macroConfig = vscode.workspace.getConfiguration().get("umath.preview.macros")
let enablePreview = vscode.workspace.getConfiguration().get('umath.preview.enableMathPreview')
let showPosition = vscode.workspace.getConfiguration().get('umath.preview.position')
let renderer = vscode.workspace.getConfiguration().get('umath.preview.renderer')


// handle MathJax error. Reload on error once.
let onError = false;
let resetError = false;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    macrosArray = getMacros(vscode.window?.activeTextEditor?.document, macroConfig)
    enablePreview = vscode.workspace.getConfiguration().get('umath.preview.enableMathPreview')

    vscode.window.onDidChangeActiveTextEditor((e) => {enablePreview && e && (macrosArray = getMacros(e?.document, macroConfig))})
    vscode.window.onDidChangeTextEditorSelection((e) => {enablePreview && setPreview(e.textEditor.document, e.selections[0].active)})

    context.subscriptions.push(
        vscode.commands.registerCommand('umath.preview.closeAllPreview', clearPreview),
        vscode.commands.registerCommand('umath.preview.reloadMacros', reloadMacros),
        vscode.commands.registerCommand('umath.preview.toggleMathPreview', toggleMathPreview),
        vscode.commands.registerCommand('umath.preview.reloadPreview', () => {
            if (!enablePreview)
                return;
            const editor = vscode.window.activeTextEditor;
            setPreview(editor.document, editor.selection.active);
        }),
        vscode.workspace.onDidChangeConfiguration(() => {
            macroConfig = vscode.workspace.getConfiguration().get("umath.preview.macros");
            showPosition = vscode.workspace.getConfiguration().get('umath.preview.position');
            renderer = vscode.workspace.getConfiguration().get('umath.preview.renderer');
            enablePreview = vscode.workspace.getConfiguration().get('umath.preview.enableMathPreview');
            if(!enablePreview) 
                clearPreview();
        })
    )
}

/**
 * MAIN
 * @param {vscode.TextDocument} document 
 * @param {vscode.Position} position 
 * @returns 
 */
function setPreview(document, position) {
    clearPreview()
    if (!document || !position)  return;

    // handle error
    if (onError) {
        resetError && (onError = !onError)
        resetError = !resetError
    }

    const testScope = getMathScope(document, position)
    // exclude (not math environment) or (in math delimiter)
    if (!!testScope && !testScope.isInBeginDelimiter && !testScope.isInEndDelimiter) {
        const beginMath = getBegin(testScope.scope.includes('latex'), testScope.isDisplayMath)
        const endMath = getEnd(testScope.scope.includes('latex'), testScope.isDisplayMath)
        const mathRange = getMathRange(document, position, beginMath, endMath)
        let mathExpression = document.getText(mathRange);

        // don't render blank formula
        if (mathExpression === '' || mathExpression.replace(/[\n\r ]/g, '') === '')
            return;

        // display math
        if (testScope.isDisplayMath) {
            // get rid of "blockquote" & "list"
            if (testScope.scope.indexOf("quote") !== -1)
                mathExpression = mathExpression.replace(/[\n\r]([ \s]*>)+/g, "")
                
            mathExpression = (macrosArray?.join('\n')??"") + mathExpression;
            let previewPosition = undefined;
            if (showPosition === 'top') {
                const beginInfo = jumpToBeginPosition(document, position, beginMath)
                previewPosition = beginInfo.insertPosition
            } else {
                const endInfo = jumpToEndPosition(document, position, endMath)
                previewPosition = new vscode.Position(endInfo.insertPosition.line, endInfo.insertPosition.character - endInfo.match.matchStr.length)
            }
            pushPreview(mathExpression, true, previewPosition)
        }
        // inline math
        else {
            mathExpression = (macrosArray?.join('\n')??"") + mathExpression;
            const beginInfo = jumpToBeginPosition(document, position, beginMath)
            const previewPosition = beginInfo.insertPosition
            pushPreview(mathExpression, false, previewPosition)
        }
    }
}

/**
 * render and push math preview
 * @param {string} mathExpression 
 * @param {boolean} isBlock 
 * @param {vscode.Position} previewPosition 
 */
function pushPreview(mathExpression, isBlock, previewPosition) {
    texRenderer[renderer](mathExpression, isBlock)
        .then((svgString) => {
            // exclude error case
            if (svgString.includes("error"))
                return
            // create preview panel
            let mathPreview = createPreview(svgString)
            decorationArray.push(mathPreview)
            vscode.window.activeTextEditor.setDecorations(mathPreview, [new vscode.Range(previewPosition, previewPosition)])
        })
        .catch((err) => {
            console.log(err.message);
            if (onError) {
                onError = false;
                resetError = false;
                return
            }
            else {
                console.log("retry");
                onError = true;
                const editor = vscode.window.activeTextEditor;
                setPreview(editor.document, editor.selection.active);
                return
            }
        });
}

/**
 * process svg string and create preview panel
 * @param {string} mathString 
 * @returns {vscode.TextEditorDecorationType} 
 */
function createPreview(mathString) {

    // TODO: add colortheme-kind to global variable
    // TODO: add global configuration
    const stringColor = (vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light ? '#111' : '#fff'); // = Light

    mathString = mathString.replace(/"/g, "'")
        .replace(/(?<=style\s*=\s*)'/, `'color:${stringColor};`)
        .replace(/#/g, "%23")
        .replace(/<mjx-container[^<]*><svg/, "<svg")
        .replace("</mjx-container>", "")

    const defaultCss = objectToCssString({
        // TODO: is there a better way to process svg string? 
        // Another way to escape \" is : replace(/"/g, "\\\"")
        ['content']: `url("data:image/svg+xml;utf8,${mathString}")`,
        ['position']: 'absolute',
        ['padding']: '0.5em',
        // Info: Text and preview SVG are positioned in reverseshow.
        [showPosition === 'top' ? 'bottom' : 'top']: `1.15rem`,
        ['display']: `inline-block`,
        ['z-index']: 1,
        ['pointer-events']: 'none',
        ['background-color']: `var(--vscode-editor-background)`,
        // ['filter']: 'invert(100%)',
        ['border']: '0.5px solid var(--vscode-editorWidget-border)'
        // TODO: set scale
    })

    return vscode.window.createTextEditorDecorationType({
        before: {
            contentText: '',
            textDecoration: `none; ${defaultCss} `,
        },
        textDecoration: `none; position: relative;`,
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    })
}

// from `hoovercj.vscode-power-mode` extension
function objectToCssString(settings) {
    let value = ''
    const cssString = Object.keys(settings)
        .map((setting) => {
            value = settings[setting]
            if (typeof value === 'string' || typeof value === 'number') {
                return `${setting}: ${value};`
            }
        })
        .join(' ')
    return cssString
}

/////////////////////////////////////////////////////////

function clearPreview() {
    for (let thisDeco of decorationArray)
        thisDeco.dispose()
    decorationArray.length = 0;
}

function reloadMacros() {
    if (!enablePreview) 
        return;
    macroConfig = vscode.workspace.getConfiguration().get('umath.preview.macros')
    macrosArray = getMacros(vscode.window.activeTextEditor.document, macroConfig)
    const editor = vscode.window.activeTextEditor;
    setPreview(editor.document, editor.selection.active);
}

function toggleMathPreview() {
    vscode.workspace.getConfiguration().update('umath.preview.enableMathPreview', !enablePreview, true)
    enablePreview = !enablePreview
    clearPreview();
    if (!enablePreview) 
        return;
    const editor = vscode.window.activeTextEditor;
    macrosArray = getMacros(editor.document, macroConfig);
    setPreview(editor.document, editor.selection.active);
}

module.exports = {
    activate
}