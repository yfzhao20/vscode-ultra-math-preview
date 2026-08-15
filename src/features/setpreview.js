"use strict";

const vscode = require('vscode')
const { temp, PreviewState } = require('../index');
const { clearPreview } = require('../util/pushpreview')
const { MATH_REPLACE_REGEX } = require('../util/constants')
const { getCachedMathScope, isValidMathScope } = require('../util/get-scopes');
const {
    processMathExpression,
    HeightCalculator,
    getConfig,
    calculatePreviewPosition,
    finalizePreview
} = require('../util/mathexpressionprocesor');

let renderTimeout_setPreview;
// Added rendering request stabilization
function setPreview(document, position, editor = vscode.window.activeTextEditor) {
    const requestId = ++PreviewState.renderRequestId;

    temp.previewSnapshot = null;
    temp.svgString = null;
    clearTimeout(renderTimeout_setPreview);

    if (PreviewState.config.debounceTime == 0) {
        return _setPreview(document, position, requestId, editor);
    }

    renderTimeout_setPreview = setTimeout(
        () => _setPreview(document, position, requestId, editor),
        PreviewState.config.debounceTime
    );
}

/**
 * MAIN
 * @param {vscode.TextDocument} document 
 * @param {vscode.Position} position 
 * @param {number} [requestId]
 * @param {vscode.TextEditor} [editor]
 * @returns 
 */
async function _setPreview(document, position, requestId, editor) {
    if (typeof requestId === 'undefined') {
        requestId = ++PreviewState.renderRequestId;
        editor = vscode.window.activeTextEditor;
        temp.previewSnapshot = null;
        temp.svgString = null;
    }

    if (requestId !== PreviewState.renderRequestId) return;

    // Pre-confirmation
    if (!PreviewState.config.enablePreview || !document || !position || PreviewState.ERROR.occurred)
        return;

    if (!editor
        || editor !== vscode.window.activeTextEditor
        || editor.document !== document) return;

    clearPreview(false);

    // Get math ranges
    const testScope = getCachedMathScope(document, position);
    if (!isValidMathScope(testScope)) {
        temp.IsMathScope = false; return;
    } else {
        temp.IsMathScope = true;
    }

    // Parse mathematical expressions
    const { mathExpression, isDisplayMath, beginInfo, endInfo } = processMathExpression(document, testScope, position);
    if (!mathExpression || mathExpression.match(MATH_REPLACE_REGEX.blankFormula)) return;

    // Calculate the preview height
    const height = await HeightCalculator.getRenderHeight(
        PreviewState.macrosString + mathExpression,
        isDisplayMath,
        PreviewState.config.renderer
    );
    if (!height
        || requestId !== PreviewState.renderRequestId
        || editor !== vscode.window.activeTextEditor) return;

    // Render the preview and set the position
    const lineHeight = getConfig('editor', 'lineHeight', 0);
    const lineHeightConfig = lineHeight === 0 ? 1.2 : lineHeight;// workspace config
    const visibleRanges = editor.visibleRanges[0];
    const instLine = calculatePreviewPosition(
        lineHeightConfig,
        height,
        visibleRanges,
        PreviewState.config.position,
        beginInfo,
        endInfo
    );

    const svgString = await finalizePreview(
        PreviewState.macrosString + mathExpression,
        isDisplayMath,
        instLine,
        endInfo,
        requestId,
        editor
    );

    if (!svgString || requestId !== PreviewState.renderRequestId) return;

    const previewSnapshot = Object.freeze({
        svgString,
        height,
        beginInfo,
        endInfo,
        requestId,
        editor
    });

    temp.previewSnapshot = previewSnapshot;
    temp.svgString = svgString;
    temp.height = height;
    temp.beginInfo = beginInfo;
    temp.endInfo = endInfo;
}

module.exports = {
    setPreview,
    _setPreview
};
