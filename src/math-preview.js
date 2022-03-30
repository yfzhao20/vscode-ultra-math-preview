"use strict";

const vscode = require('vscode')
const macros = require('./get-macros')
const hscopes = require('./util/get-scopes')
const delimiter = require('./util/get-delimiter-position')

// init
let decorationArray = new Array;
let macrosInfo = {};
let macroConfig = vscode.workspace.getConfiguration().get("umath.preview.macros")
let enablePreview = vscode.workspace.getConfiguration().get('umath.preview.enableMathPreview')


// handle MathJax error. Reload on error once.
let onError = false;
let resetError = false;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    macrosInfo = macros.getMacros(vscode.window.activeTextEditor.document, macroConfig)
    enablePreview = vscode.workspace.getConfiguration().get('umath.preview.enableMathPreview')

    vscode.window.onDidChangeActiveTextEditor((e) => {
        if( enablePreview && e )
            macrosInfo = macros.getMacros(e.document, macroConfig);
    })

    vscode.window.onDidChangeTextEditorSelection((e) => {
        if (!enablePreview) return;
        macrosInfo = macros.getMacros(e.textEditor.document, macroConfig)
        setPreview(e.textEditor.document, e.selections[0].active)
    })

    context.subscriptions.push(
        vscode.commands.registerCommand('umath.preview.closeAllPreview', clearPreview),
        vscode.commands.registerCommand('umath.preview.reloadMacros', reloadMacros),
        vscode.commands.registerCommand('umath.preview.toggleMathPreview', toggleMathPreview),
        vscode.commands.registerCommand('umath.preview.reloadPreview', () => { enablePreview && setPreview() }),
        vscode.workspace.onDidChangeConfiguration(() => {
            macroConfig = vscode.workspace.getConfiguration().get("umath.preview.macros");
            enablePreview = vscode.workspace.getConfiguration().get('umath.preview.enableMathPreview')
            !enablePreview && clearPreview();
        })
    )
}


// main
function setPreview(document, position) {

    clearPreview()

    if (!vscode.window.activeTextEditor) return;
    if (!document) document = vscode.window.activeTextEditor.document;
    if (!position) position = vscode.window.activeTextEditor.selection.active;

    // handle error
    if (onError) {
        resetError && (onError = !onError)
        resetError = !resetError
    }

    // TODO: exit when document === undefined (?)
    // TODO: forcibly reload hscopes when error

    const testScope = hscopes.getMathScope(document, position)

    // exclude (not math environment) or (in math delimiter)
    if (!!testScope && !testScope.isInBeginDelimiter && !testScope.isInEndDelimiter) {
        // display math
        if (testScope.isDisplayMath) {
            const mathRange = delimiter.getMathRange(document, position, delimiter.beginDisplayMath, delimiter.endDisplayMath)
            let mathExpression = document.getText(mathRange);

            // don't render blank formula
            if (mathExpression === '' || mathExpression.replace(/[\n\r ]/g, '') === '') return;

            // get rid of "blockquote" & "list"

            if (testScope.scope.indexOf("quote") !== -1) mathExpression = mathExpression.replace(/[\n\r]([ \s]*>)+/g, "")

            if (!!macrosInfo) mathExpression = macrosInfo.macrosArray.join('\n') + mathExpression;

            // enable render \\ as line break
            mathExpression = '\\displaylines{' + mathExpression + '}'

            const endInfo = delimiter.jumpToEndPosition(document, position, delimiter.endDisplayMath)
            const previewPosition = new vscode.Position(endInfo.insertPosition.line, endInfo.insertPosition.character - endInfo.match.matchStr.length)
            pushPreview(mathExpression, previewPosition)
        }
        // inline math
        else if (!testScope.isDisplayMath) {
            const mathRange = delimiter.getMathRange(document, position, delimiter.beginInlineMath, delimiter.endInlineMath)
            let mathExpression = document.getText(mathRange)

            // don't render blank formula
            if (mathExpression === '' || mathExpression.replace(/ /g, '') === '') return;

            if (!!macrosInfo) mathExpression = macrosInfo.macrosArray.join('\n') + mathExpression;

            const beginInfo = delimiter.jumpToBeginPosition(document, position, delimiter.beginInlineMath)
            const previewPosition = beginInfo.insertPosition
            pushPreview(mathExpression, previewPosition)
        }
    }

}


function pushPreview(mathExpression, previewPosition) {
    require('mathjax')
    .init({
        loader: {
            load: ['input/tex', 'output/svg']
        }
    }).then((MathJax) => {
            const svg = MathJax.tex2svg(mathExpression, { display: false });
            const svgString = MathJax.startup.adaptor.outerHTML(svg);
            // exclude error case
            if (svgString.indexOf("error") !== -1) return
            // create preview panel
            let mathPreview = createPreview(svgString)
            // TODO: scale svg
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
                setPreview();
                return
            }
        });
}


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
        ['top']: `1.15rem`,
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
    if (decorationArray.length) {
        let index = decorationArray.length
        while (--index >= 0) { // OR: while (index--) {...}
            decorationArray[index].dispose();
            decorationArray.splice(index, 1)
        }
    }
}

function reloadMacros() {
    macroConfig = vscode.workspace.getConfiguration().get('umath.preview.macros')
    macrosInfo = macros.getMacros(vscode.window.activeTextEditor.document, macroConfig)
}

function toggleMathPreview() {
    vscode.workspace.getConfiguration().update('umath.preview.enableMathPreview', !enablePreview, true)
    enablePreview = !enablePreview
    clearPreview();
    if (enablePreview) {
        macrosInfo = macros.getMacros(vscode.window.activeTextEditor.document, macroConfig);
        setPreview()
    }
}

module.exports = {
    activate
}