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

function InsertCursor(mathExpression, mathRange, position) {
    // Gets the math formula scope of the current cursor position
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
 * 在指定行和列插入符号
 * @returns {string} 插入符号后的字符串
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

    static parseMaxHeight() {
        const css = PreviewState.config.css || '';
        return getMaxHeightValueAndUnit(defaultCSS.maxheight + defaultCSS.OtherCSS + css);
    }

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

// Obtain the configuration item
function getConfig(section, key, defaultValue) {
    return vscode.workspace.getConfiguration(section).get(key) ?? defaultValue;
}

// Calculate the preview position
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

function finalizePreview(expression, isDisplayMath, line, endInfo) {
    const charPos = endInfo.insertPosition.character - (endInfo.match?.matchStr?.length ?? 0);
    const previewPosition = new vscode.Position(line, charPos);
    pushPreview(expression, isDisplayMath, previewPosition);
}

// Calculate the cutting range
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

// deal with mathematical expression content
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
