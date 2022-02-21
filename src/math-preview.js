"use strict";

const vscode = require('vscode')
const hscopes = require('./util/get-scopes')
const delimiter = require('./util/get-delimiter-position')

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    vscode.window.onDidChangeTextEditorSelection(setPreview)
    context.subscriptions.push(
        vscode.commands.registerCommand('umath.preview.closeAllPreview', clearPreview)
    )
}


// initial preview Array
let decorationArray = new Array;

// handle MathJax error. Reload on error once.
let onError = false;
let resetError = false;

function setPreview() {

    clearPreview()

    if (vscode.window.activeTextEditor === undefined) return;

    // handle error
    if(onError){
        resetError && (onError = !onError)
        resetError = !resetError
    }

    const document = vscode.window.activeTextEditor.document;
    const position = vscode.window.activeTextEditor.selection.active;

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

            if (testScope.scope.indexOf("quote") !== -1) {
                mathExpression = mathExpression.replace(/[\n\r]([ \s]*>)+/g, "")
            }

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
                // TODO: Add more settings
                load: ['input/tex', 'output/svg']
            }
        })
        .then((MathJax) => {
            const svg = MathJax.tex2svg(mathExpression, {display: false });
            const svgString = MathJax.startup.adaptor.outerHTML(svg);
            // exclude error case
            if (svgString.indexOf("error") !== -1) return
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
            else{
                onError = true;
                setPreview();
                return
            }
        });
}


function createPreview(mathString) {

    const defaultCss = objectToCssString({
        // TODO: is there a better way to process svg string? 
        // Another way to escape \" is : replace(/"/g, "\\\"")
        ['content']: `url("data:image/svg+xml;utf8,${mathString.replace(/#/g, "%23").replace(/"/g, "'").replace(/<mjx-container[^<]*><svg/, "<svg").replace("</mjx-container>", "")}")`,
        ['position']: 'absolute',
        ['padding']: '0.5em',
        ['top']: `1.1rem`,
        ['display']: `inline-block`,
        ['z-index']: 1,
        ['pointer-events']: 'none',
        ['background-color']: '#e1e1e1',
        ['filter']: 'invert(100%)',
        ['border']: '0.5px solid #5e5e5e'
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

function clearPreview() {
    if (decorationArray.length) {
        let index = decorationArray.length
        while (--index >= 0) {
            decorationArray[index].dispose();
            decorationArray.splice(index, 1)
        }
    }
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

module.exports = {
    activate
}