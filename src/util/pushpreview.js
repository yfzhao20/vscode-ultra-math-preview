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
 * @param {number} requestId
 * @param {vscode.TextEditor} editor
 * @returns {Promise<string | null>} The committed SVG, or null when obsolete.
 */
async function pushPreview(mathExpression, isBlock, previewPosition, requestId, editor) {
    try {
        const svgString = await texRenderer[PreviewState.config.renderer](mathExpression, isBlock);

        if (requestId !== PreviewState.renderRequestId
            || editor !== vscode.window.activeTextEditor
            || !PreviewState.config.enablePreview
            || svgString.includes("error")) {
            return null;
        }

        // create preview panel
        let mathPreview = createPreview(svgString)
        // set when clause
        vscode.commands.executeCommand('setContext', 'umathShowPreview', true)
        PreviewState.decorationArray.push(mathPreview)
        editor.setDecorations(mathPreview, [new vscode.Range(previewPosition, previewPosition)])
        return svgString;
    } catch (err) {
        if (requestId !== PreviewState.renderRequestId) return null;

        console.log(err.message);
        if (PreviewState.ERROR.occurred) {
            PreviewState.ERROR.occurred = false;
            PreviewState.ERROR.reset = false;
        }
        else {
            console.log("retry");
            PreviewState.ERROR.reset = true;
        }
        return null;
    }
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

function clearPreview(invalidatePending = true) {
    if (invalidatePending) {
        PreviewState.renderRequestId += 1;
        temp.previewSnapshot = null;
        temp.svgString = null;
    }

    PreviewState.decorationArray.forEach(decoration => {
        decoration.dispose();
    });
    PreviewState.decorationArray = [];
}

module.exports = {
    clearPreview,
    createPreview,
    pushPreview
};
