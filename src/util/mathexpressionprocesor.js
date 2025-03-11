'use strict'

const vscode = require('vscode')
const { PreviewState } = require('../index');
const { cursorInsertString } = require('./constants')
const { defaultCSS, MATH_REPLACE_REGEX } = require('./constants');
const { pushPreview } = require('./pushpreview')
const {
    getMaxHeightValueAndUnit,
    renderAndGetHeightInEm
} = require('./autoPreviewPosition');
const {
    jumpToBeginPosition, jumpToEndPosition, getBegin, getEnd
} = require('./get-delimiter-position')

/**
 * Processes the math expression in the document.
 * @param {vscode.TextDocument} document - The document containing the math expression.
 * @param {Object} testScope - The scope information for the math expression.
 * @param {vscode.Position} position - The position of the cursor in the document.
 * @returns {Object} - An object containing the processed math expression, display math flag, and begin/end info.
 */
function processMathExpression(document, testScope, position) {
    const beginMath = getBegin(testScope.scope.includes('meta.math.block'), testScope.isDisplayMath);
    const endMath = getEnd(testScope.scope.includes('meta.math.block'), testScope.isDisplayMath);

    const beginInfo = jumpToBeginPosition(document, position, beginMath);
    const endInfo = jumpToEndPosition(document, position, endMath);

    const mathRange = calculateMathCutRange(beginInfo, endInfo);
    let mathExpression = document.getText(mathRange);
    const IsEnableCursor = PreviewState.config.enableCursor;
    if (IsEnableCursor) {
        mathExpression = InsertCursor(mathExpression, mathRange, position);
    }

    return {
        mathExpression: processMathContent(mathExpression, testScope),
        isDisplayMath: testScope.isDisplayMath,
        beginInfo,
        endInfo
    };
}

/**
 * Inserts a cursor symbol into the math expression at the specified position.
 * @param {string} mathExpression - The math expression to insert the cursor into.
 * @param {vscode.Range} mathRange - The range of the math expression in the document.
 * @param {vscode.Position} position - The position of the cursor in the document.
 * @returns {string} - The math expression with the cursor symbol inserted.
 */
function InsertCursor(mathExpression, mathRange, position) {
    const CursorType = PreviewState.config.cursorType;

    let Cart;
    switch (CursorType) {
        case "Hand-shape emoji":
            Cart = cursorInsertString.HandShapeEmoji; break;
        case "blacktriangleright":
            Cart = cursorInsertString.BlackTriangleRight; break;
        default:
            return mathExpression;
    }

    const newMathExpression = insertCartAtPosition(mathExpression,
        mathRange, position, Cart)

    return newMathExpression;
}

/**
 * Inserts a symbol at the specified position in the math expression.
 * @param {string} mathExpression - The math expression to insert the symbol into.
 * @param {vscode.Range} mathRange - The range of the math expression in the document.
 * @param {vscode.Position} position - The position of the cursor in the document.
 * @param {string} Cart - The symbol to insert.
 * @returns {string} - The math expression with the symbol inserted.
 */
function insertCartAtPosition(mathExpression, mathRange, position, Cart) {
    const lines = mathExpression.split('\n');
    const targetCol = position.character - mathRange.start.character;
    const targetline = position.line - mathRange.start.line;

    const targetStringLine = lines[targetline];
    const newLine = targetStringLine.slice(0, targetCol) + Cart
        + targetStringLine.slice(targetCol);
    lines[targetline] = newLine;

    return lines.join('\n');
}

// svg Height calculator
class HeightCalculator {
    /**
     * Gets the rendered height of the math expression.
     * @param {string} mathExpression - The math expression to render.
     * @param {boolean} isDisplayMath - Whether the math expression is display math.
     * @param {Object} renderer - The renderer to use for rendering the math expression.
     * @returns {Promise<number | null>} - The height of the rendered math expression.
     */
    static async getRenderHeight(mathExpression, isDisplayMath, renderer) {
        try {
            const height = await renderAndGetHeightInEm(
                mathExpression,
                isDisplayMath,
                renderer
            );

            if (typeof height === 'undefined') return null;

            const { MaxHeightValue, Unit } = this.parseMaxHeight();
            return this.convertHeightUnit(height, MaxHeightValue, Unit);
        } catch (error) {
            console.error("Render error:", error);
            return null;
        }
    }

    /**
     * Parses the maximum height from the CSS configuration.
     * @returns {Object} - An object containing the maximum height value and unit.
     */
    static parseMaxHeight() {
        const css = PreviewState.config.css || '';
        return getMaxHeightValueAndUnit(defaultCSS.maxheight + defaultCSS.OtherCSS + css);
    }

    /**
     * Converts the height to the specified unit.
     * @param {number} height - The height to convert.
     * @param {number} maxValue - The maximum height value.
     * @param {string} unit - The unit to convert the height to.
     * @returns {number} - The converted height.
     */
    static convertHeightUnit(height, maxValue, unit) {
        const converters = {
            'em': () => Math.min(maxValue, height),
            'px': () => {
                const fontSize = getConfig('editor', 'fontSize', 14);
                return Math.min(maxValue / fontSize, height);
            },
            default: () => 30
        };

        return (converters[unit] || converters.default)();
    }
}

/**
 * Obtains the configuration item from the workspace.
 * @param {string} section - The section of the configuration.
 * @param {string} key - The key of the configuration.
 * @param {any} defaultValue - The default value to return if the configuration is not found.
 * @returns {any} - The configuration value.
 */
function getConfig(section, key, defaultValue) {
    return vscode.workspace.getConfiguration(section).get(key) ?? defaultValue;
}

/**
 * Calculates the preview position based on the line height and visible ranges.
 * @param {number} lineHeightConfig - The line height configuration.
 * @param {number} height - The height of the preview.
 * @param {vscode.Range} visibleRanges - The visible ranges in the document.
 * @param {string} configPosition - The configuration position (e.g., 'bottom').
 * @param {Object} beginInfo - The begin info of the math expression.
 * @param {Object} endInfo - The end info of the math expression.
 * @returns {number} - The calculated preview position.
 */
function calculatePreviewPosition(lineHeightConfig, height, visibleRanges, configPosition, beginInfo, endInfo) {
    const lineHeight = Math.floor(height / lineHeightConfig);
    const Isbottom = Boolean(configPosition === 'bottom');
    const candidate = Isbottom ? endInfo.insertPosition.line
        : beginInfo.insertPosition.line;

    return Math.min(
        Math.max(candidate, Isbottom ? visibleRanges.start.line + 1
            : visibleRanges.start.line + lineHeight),
        Isbottom ? visibleRanges.end.line - lineHeight : visibleRanges.end.line
    );
}

/**
 * Finalizes the preview by pushing it to the preview system.
 * @param {string} expression - The math expression to preview.
 * @param {boolean} isDisplayMath - Whether the math expression is display math.
 * @param {number} line - The line number to preview the expression at.
 * @param {Object} endInfo - The end info of the math expression.
 */
function finalizePreview(expression, isDisplayMath, line, endInfo) {
    const charPos = endInfo.insertPosition.character - (endInfo.match?.matchStr?.length ?? 0);
    const previewPosition = new vscode.Position(line, charPos);
    pushPreview(expression, isDisplayMath, previewPosition);
}

/**
 * Calculates the cutting range for the math expression.
 * @param {Object} beginInfo - The begin info of the math expression.
 * @param {Object} endInfo - The end info of the math expression.
 * @returns {vscode.Range} - The calculated cutting range.
 */
function calculateMathCutRange(beginInfo, endInfo) {
    const cutBegin = beginInfo.match?.matchStr?.match(MATH_REPLACE_REGEX.delimiter)?.[0]?.length ?? 0;
    const cutEnd = endInfo.match ? (cutBegin > 2 ? cutBegin - 2 : cutBegin) : 0;
    return new vscode.Range(
        beginInfo.insertPosition.line,
        beginInfo.insertPosition.character + cutBegin,
        endInfo.insertPosition.line,
        endInfo.insertPosition.character - cutEnd
    );
}

/**
 * Processes the content of the math expression.
 * @param {string} mathExpression - The math expression to process.
 * @param {Object} testScope - The scope information for the math expression.
 * @returns {string} - The processed math expression.
 */
function processMathContent(mathExpression, testScope) {
    if (testScope.isDisplayMath && testScope.scope.includes("quote")) {
        return mathExpression.replace(MATH_REPLACE_REGEX.blockquote, "");
    }
    return mathExpression;
}

module.exports = {
    processMathExpression,
    HeightCalculator,
    getConfig,
    calculatePreviewPosition,
    finalizePreview,
    calculateMathCutRange,
    processMathContent,
};