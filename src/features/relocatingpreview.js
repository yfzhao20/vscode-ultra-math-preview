"use strict";

const vscode = require('vscode')
const { temp, PreviewState } = require('../index');
const { clearPreview, createPreview } = require('../util/pushpreview')
const {
    getConfig,
    calculatePreviewPosition
} = require('../util/mathexpressionprocesor');

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
    if (!PreviewState.config.enablePreview ||!svgString || PreviewState.ERROR.occurred || !temp.IsMathScope) return;

    // get the global var
    const height = temp.height;
    const beginInfo = temp.beginInfo;
    const endInfo = temp.endInfo;

    // Render the preview and set the position
    const lineHeight = getConfig('editor', 'lineHeight', 0);
    const lineHeightConfig = lineHeight === 0 ? 1.2 : lineHeight;
    const visibleRanges = vscode.window.activeTextEditor.visibleRanges[0];
    const instLine = calculatePreviewPosition(
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

module.exports = {
    reLocatingPreview
};