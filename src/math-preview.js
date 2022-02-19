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
        vscode.commands.registerCommand('mathkey.closeAllPreview', clearPreview)
    )
}


// initial preview Array
let decorationArray = new Array;

function setPreview() {

    clearPreview()

    const document = vscode.window.activeTextEditor.document;
    const position = vscode.window.activeTextEditor.selection.active;
    const scope = hscopes.getScope(document, position).toString()

    // TODO: reload hscopes when error
    // console.log(scope);

	// TODO: import isMathEnvironment from get-scopes.js
    // BUG: delimiter process! 
    // display math
    if (
        (
            (document.languageId === 'latex' && scope.indexOf("math.block.environment") !== -1) ||
            (document.languageId === 'markdown' && (scope.indexOf("math.block") !== -1 || scope.indexOf("math.display") !== -1))
        ) &&
        !(scope.indexOf("definition.math") !== -1 || scope.indexOf("definition.string") !== -1)
    ) {
        const mathRange = delimiter.getMathRange(document, position, delimiter.beginDisplayMath, delimiter.endDisplayMath)
        let mathExpression = document.getText(mathRange);
        if (mathExpression === '' || mathExpression.replace(/[\n\r ]/g, '') === '') return;
        mathExpression = '\\displaylines{' + mathExpression + '}'

        const endInfo = delimiter.jumpToEndPosition(document, position, delimiter.endDisplayMath)
        const previewPosition = new vscode.Position(endInfo.insertPosition.line, endInfo.insertPosition.character - endInfo.match.matchStr.length)

        pushPreview(mathExpression, previewPosition)
        return;
    }
    // inline math
    else if (
        (scope.indexOf("math") !== -1) &&
        !(scope.indexOf("definition.math.begin") !== -1 || scope.indexOf("definition.string.begin") !== -1)
    ) {
        const mathRange = delimiter.getMathRange(document, position, delimiter.beginInlineMath, delimiter.endInlineMath)
        const mathExpression = document.getText(mathRange)

        if (mathExpression === '' || mathExpression.replace(/ /g, '') === '') return;

        const beginInfo = delimiter.jumpToBeginPosition(document, position, delimiter.beginInlineMath)
        const previewPosition = beginInfo.insertPosition

        pushPreview(mathExpression, previewPosition)
        return;
    }

}



function createPreview(mathString) {

    const defaultCss = objectToCssString({
        // TODO: is there a better way to process svg string? 
        ['content']: `url("data:image/svg+xml;utf8,${mathString.replace(/[\n\r]/g,"").replace(/#/g,"%23").replace(/"/g,"'").replace(/<mjx-container[^<]*><svg/,"<svg").replace("</mjx-container>","")}")`,
        ['position']: 'absolute',
        ['padding']: '0.5em',
        ['top']: `1.1rem`,
        ['display']: `inline-block`,
        ['z-index']: 1,
        ['pointer-events']: 'none',
        ['background-color']: '#e1e1e1',
        ['filter']: 'invert(100%)',
        ['border']: '1px solid #5e5e5e',
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

function pushPreview(mathExpression, previewPosition) {
    require('mathjax')
        .init({
            loader: {
                // TODO: Add more settings
                load: ['input/tex', 'output/svg']
            }
        })
        .then((MathJax) => {
            const svg = MathJax.tex2svg(mathExpression, {
                display: false
            });
            const svgString = MathJax.startup.adaptor.outerHTML(svg);

                if (svgString.indexOf("error") !== -1) return

            let mathPreview = createPreview(svgString)
            decorationArray.push(mathPreview)

            vscode.window.activeTextEditor.setDecorations(mathPreview, [new vscode.Range(previewPosition, previewPosition)])

        })
        .catch((err) => console.log(err.message));
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