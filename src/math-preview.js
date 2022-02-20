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

function setPreview() {
    
    clearPreview()

    const document = vscode.window.activeTextEditor.document;
    const position = vscode.window.activeTextEditor.selection.active;

    // TODO: reload hscopes when error

    const testScope = getMathScope(document,position)

    // exclude (not math environment) or (in math delimiter)
    if (!!testScope && !testScope.isInBeginDelimiter && !testScope.isInEndDelimiter) {
        // display math
        if (testScope.isDisplayMath ) {
            const mathRange = delimiter.getMathRange(document, position, delimiter.beginDisplayMath, delimiter.endDisplayMath)
            let mathExpression = document.getText(mathRange);
            
            // don't render blank formula
            if (mathExpression === '' || mathExpression.replace(/[\n\r ]/g, '') === '') return ; 

            // get rid of "blockquote" & "list"

            if (testScope.scope.indexOf("quote") !== -1){
                mathExpression = mathExpression.replace(/[\n\r]([ \s]*>)+/g,"")
            }

            // enable render \\ as line break
            mathExpression = '\\displaylines{' + mathExpression + '}'

            const endInfo = delimiter.jumpToEndPosition(document, position, delimiter.endDisplayMath)
            const previewPosition = new vscode.Position(endInfo.insertPosition.line, endInfo.insertPosition.character - endInfo.match.matchStr.length)
            pushPreview(mathExpression, previewPosition)
        }
        // inline math
        else if (!testScope.isDisplayMath ) {
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
            const svg = MathJax.tex2svg(mathExpression, {
                display: false
            });
            const svgString = MathJax.startup.adaptor.outerHTML(svg);

                if (svgString.indexOf("error") !== -1) return

            let mathPreview = createPreview(svgString)
            decorationArray.push(mathPreview)

            vscode.window.activeTextEditor.setDecorations(mathPreview, [new vscode.Range(previewPosition, previewPosition)])

        })
        .catch((err) => {
            console.log(err.message);

            // TODO: recall setPreview() to reload preview. beware of infinite loop.

        });
}


function createPreview(mathString) {

    const defaultCss = objectToCssString({
        // TODO: is there a better way to process svg string? 
        // Another way to escape \" is : replace(/"/g, "\\\"")
        ['content']: `url("data:image/svg+xml;utf8,${mathString.replace(/#/g,"%23").replace(/"/g,"'").replace(/<mjx-container[^<]*><svg/,"<svg").replace("</mjx-container>","")}")`,
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



function getMathScope(document, position) {
	const langId = document.languageId;
    let matchDisplayMath    = new RegExp;
    let matchBeginDelimiter = new RegExp;
    let matchEndDelimiter   = new RegExp;
    

    // get Language
    
    if (langId === 'markdown') {
        matchDisplayMath    = /math\.block|math\.display/
        matchBeginDelimiter = /definition\.math\.begin/
        matchEndDelimiter   = /definition\.math\.end/
    }
    else if (langId === 'latex') {
        matchDisplayMath    = /math\.block\.environment/
        matchBeginDelimiter = /definition\.string\.begin/
        matchEndDelimiter   = /definition\.string\.end/
    }
    else{ return undefined }

    // get scope 

    const scope = hscopes.getScope(document, position).toString();

    if ( !scope || scope.indexOf('math') === -1) {
        return undefined
    }

    // get isDisplayMath

    const isDisplayMath = (scope.match(matchDisplayMath) !== null ) ;

    // get delimiter info

    let isInBeginDelimiter = false;
    let isInEndDelimiter = false;

    if ( scope.match(matchBeginDelimiter) !== null ){
        isInBeginDelimiter = true
    }
    else if (scope.match(matchEndDelimiter) != null) {
        const localMatch = document.getText(new vscode.Range(position, document.lineAt(position).range.end))
        const matchArray = isDisplayMath ? delimiter.endDisplayMath : delimiter.endInlineMath
        isInEndDelimiter = !!(delimiter.searchSubStr(matchArray,localMatch).matchIndex)
    }
    // TODO for markdown-all-in-one scope!!!!!


    return {
        scope,
        isDisplayMath,
        isInBeginDelimiter,
        isInEndDelimiter
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