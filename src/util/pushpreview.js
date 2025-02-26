"use strict";

const vscode = require('vscode');
const { temp, PreviewState } = require('../index');
const texRenderer = require('./texRenderer');
const { defaultCSS, SVG_REPLACE_REGEX } = require('./constants');

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

function clearPreview() {
    PreviewState.decorationArray.forEach(decoration => {
        vscode.window.activeTextEditor?.setDecorations(decoration, []);
    });
    PreviewState.decorationArray = [];
}

module.exports = {
    clearPreview,
    createPreview,
    pushPreview
};