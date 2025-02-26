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
const RENDER_DEBOUNCE_setPreview = 50; // 50ms
// Added rendering request stabilization
function setPreview(document, position) {
    clearTimeout(renderTimeout_setPreview);
    renderTimeout_setPreview = setTimeout(
        () => _setPreview(document, position), RENDER_DEBOUNCE_setPreview);
}

/**
 * MAIN
 * @param {vscode.TextDocument} document 
 * @param {vscode.Position} position 
 * @returns 
 */
async function _setPreview(document, position) {
    // Pre-confirmation
    clearPreview();
    if (!PreviewState.config.enablePreview || !document || !position || PreviewState.ERROR.occurred)
        return;

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
    if (!height) return;

    // Render the preview and set the position
    const lineHeight = getConfig('editor', 'lineHeight', 0);
    const lineHeightConfig = lineHeight === 0 ? 1.2 : lineHeight;// workspace config
    const visibleRanges = vscode.window.activeTextEditor.visibleRanges[0];
    const instLine = calculatePreviewPosition(
        lineHeightConfig,
        height,
        visibleRanges,
        PreviewState.config.position,
        beginInfo,
        endInfo
    );

    finalizePreview(mathExpression, isDisplayMath, instLine, endInfo);

    temp.height = height;
    temp.beginInfo = beginInfo;
    temp.endInfo = endInfo;
}

module.exports = {
    setPreview
};