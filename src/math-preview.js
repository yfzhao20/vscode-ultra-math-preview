"use strict";

const vscode = require('vscode')
const { getMacros } = require('./get-macros')
const texRenderer = require('./texRenderer')
const { getMathScope } = require('./util/get-scopes')
const { jumpToBeginPosition, jumpToEndPosition, getBegin, getEnd } = require('./util/get-delimiter-position')

// init
let decorationArray = [];
let macrosString = "";
let macroConfig = vscode.workspace.getConfiguration().get("umath.preview.macros")
let enablePreview = vscode.workspace.getConfiguration().get('umath.preview.enableMathPreview')
let positionConfig = vscode.workspace.getConfiguration().get('umath.preview.position')
let rendererConfig = vscode.workspace.getConfiguration().get('umath.preview.renderer')
let cssConfig = vscode.workspace.getConfiguration().get('umath.preview.customCSS')?.join('')


// handle MathJax error. Reload on error once.
let onError = false;
let resetError = false;
let e_temp;

/**
 * @param {vscode.ExtensionContext} context
 */
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
            enablePreview &&e&& setPreview(e_temp?.textEditor?.document, e_temp?.selections[0]?.active)
        }),

        vscode.workspace.onDidChangeConfiguration((e) => {
            e && e.affectsConfiguration("umath.preview.macros") && (macroConfig = vscode.workspace.getConfiguration().get("umath.preview.macros"));
            e && e.affectsConfiguration("umath.preview.position") && (positionConfig = vscode.workspace.getConfiguration().get('umath.preview.position'));
            e && e.affectsConfiguration("umath.preview.renderer") && (rendererConfig = vscode.workspace.getConfiguration().get('umath.preview.renderer'));
            e && e.affectsConfiguration("umath.preview.enableMathPreview") && (enablePreview = vscode.workspace.getConfiguration().get('umath.preview.enableMathPreview'));
            e && e.affectsConfiguration("umath.preview.customCSS") && (cssConfig = vscode.workspace.getConfiguration().get('umath.preview.customCSS')?.join(''));
            !enablePreview && clearPreview();
        }),
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
    if (!document || !position) return;

    // handle error
    if (onError) {
        resetError && (onError = !onError)
        resetError = !resetError
    }

    const testScope = getMathScope(document, position)
    // exclude (not math environment) or (in math delimiter)
    if (!testScope || testScope.isInBeginDelimiter || testScope.isInEndDelimiter) return;

    // isLatex: scope.includes('meta.math.block')
    const beginMath = getBegin(testScope.scope.includes('meta.math.block'), testScope.isDisplayMath)
    const endMath = getEnd(testScope.scope.includes('meta.math.block'), testScope.isDisplayMath)
    const beginInfo = jumpToBeginPosition(document, position, beginMath)
    const endInfo = jumpToEndPosition(document, position, endMath)

    // cut some delimiters
    const cutBegin = beginInfo.match?.matchStr?.match(/\$\$|\$|\\\[|\\\(|\\begin\{math\}|\\begin\{displaymath\}/)?.[0]?.length ?? 0
    const cutEnd = (endInfo.match ? (cutBegin > 2 ? cutBegin - 2 : cutBegin) : 0)  // 'begin' => 'end'
    const mathRange = new vscode.Range(
        beginInfo.insertPosition.line,
        beginInfo.insertPosition.character + cutBegin,
        endInfo.insertPosition.line,
        endInfo.insertPosition.character - cutEnd
    )
    let mathExpression = document.getText(mathRange);

    // don't render blank formula
    if (mathExpression.match(/^\s*$/)) return;

    // get rid of "blockquote" & "list"
    if (testScope.isDisplayMath && testScope.scope.indexOf("quote") !== -1)
        mathExpression = mathExpression.replace(/[\n\r]([ \s]*>)+/g, "")

    // push macros
    mathExpression = macrosString + mathExpression;

    // set preview position
    const visibleRanges = vscode.window.activeTextEditor.visibleRanges[0];
    const StartLine = visibleRanges.start.line;
    const endLine = visibleRanges.end.line;

    let UpperBoundLine, LowerBoundLine
    UpperBoundLine = Math.max(StartLine, endInfo.insertPosition.line)+5;
    LowerBoundLine = Math.min(endLine, endInfo.insertPosition.line)-10;

    const previewPosition = (positionConfig === 'bottom' && testScope.isDisplayMath
        ? new vscode.Position(LowerBoundLine,endInfo.insertPosition.character - endInfo.match?.matchStr?.length ?? 0)
        : UpperBoundLine)
    pushPreview(mathExpression, testScope.isDisplayMath, previewPosition);
}

/**
 * render and push math preview
 * @param {string} mathExpression 
 * @param {boolean} isBlock 
 * @param {vscode.Position} previewPosition 
 */
function pushPreview(mathExpression, isBlock, previewPosition) {
    texRenderer[rendererConfig](mathExpression, isBlock)
        .then((svgString) => {
            // exclude error case
            if (svgString.includes("error"))
                return
            // create preview panel
            let mathPreview = createPreview(svgString)
            // set when clause
            vscode.commands.executeCommand('setContext', 'umathShowPreview', true)
            decorationArray.push(mathPreview)
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
    const stringColor = ((vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark || vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast) ? '#fff' : '#111'); //  Dark || HC Dark
    mathString = mathString
        .replace(/(?<=style\s*=\s*)"/, `"color:${stringColor};`)
        .split("#").join('%23')
        .replace(/<mjx-container[^<]*><svg/, "<svg")
        .replace("</mjx-container>", "")

    const defaultCss =
        // Info: Text and preview SVG are positioned in reverseshow.
        `content: url('data:image/svg+xml;utf8,${mathString}');\
        position: absolute;\
        padding: 0.5em;\
        ${positionConfig === 'top' ? 'bottom' : 'top'}: 1.15em;\
        display: inline-block;\
        z-index: 1;\
        pointer-events: none;\
        background-color: var(--vscode-editor-background);\
        border: 0.5px solid var(--vscode-editorWidget-border);`
        + cssConfig

    return vscode.window.createTextEditorDecorationType({
        before: {
            contentText: '',
            textDecoration: `none; ${defaultCss} `,
        },
        textDecoration: `none; position: relative;`,
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    })
}

/////////////////////////////////////////////////////////

function clearPreview() {
    for (let thisDeco of decorationArray)
        thisDeco.dispose()
    decorationArray.length = 0;
    vscode.commands.executeCommand('setContext', 'umathShowPreview', false)
}

/////////////////////////////////////////////////////////

function reloadMacros() {
    if (!enablePreview)
        return;
    macroConfig = vscode.workspace.getConfiguration().get('umath.preview.macros')
    const editor = vscode.window?.activeTextEditor;
    macrosString = getMacros(editor?.document, macroConfig)?.join('\n') ?? ""
    setPreview(editor?.document, editor?.selection?.active);
}

function toggleMathPreview() {
    vscode.workspace.getConfiguration().update('umath.preview.enableMathPreview', !enablePreview, true)
    enablePreview = !enablePreview
    clearPreview();
    if (!enablePreview)
        return;
    const editor = vscode?.window?.activeTextEditor;
    macrosString = getMacros(editor?.document, macroConfig)?.join('\n') ?? ""
    setPreview(editor?.document, editor?.selection?.active);
}

module.exports = {
    activate
}