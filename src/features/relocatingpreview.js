"use strict";

const vscode = require('vscode')
const { temp, PreviewState } = require('../index');
const { clearPreview, createPreview } = require('../util/pushpreview')
const {
    getConfig,
    calculatePreviewPosition
} = require('../util/mathexpressionprocesor');

let renderTimeout_reLocatingPreview;

// Added rendering request stabilization
function reLocatingPreview(previewSnapshot, editor) {
    clearTimeout(renderTimeout_reLocatingPreview);

    if (PreviewState.config.debounceTime == 0) {
        return _reLocatingPreview(previewSnapshot, editor);
    }

    renderTimeout_reLocatingPreview = setTimeout(
        () => _reLocatingPreview(previewSnapshot, editor),
        PreviewState.config.debounceTime
    );
}


function _reLocatingPreview(previewSnapshot, editor) {
    if (!PreviewState.config.enablePreview
        || !PreviewState.config.autoAdjustPosition
        || !previewSnapshot
        || previewSnapshot.requestId !== PreviewState.renderRequestId
        || previewSnapshot.editor !== editor
        || editor !== vscode.window.activeTextEditor
        || PreviewState.ERROR.occurred
        || !temp.IsMathScope) return;

    clearPreview(false);

    const { svgString, height, beginInfo, endInfo } = previewSnapshot;

    // Render the preview and set the position
    const lineHeight = getConfig('editor', 'lineHeight', 0);
    const lineHeightConfig = lineHeight === 0 ? 1.2 : lineHeight;
    const visibleRanges = editor.visibleRanges[0];
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
    editor.setDecorations(mathPreview, [new vscode.Range(previewPosition, previewPosition)])
}

module.exports = {
    reLocatingPreview,
    _reLocatingPreview
};
