"use strict";

// autoPreviewPosition.js
const { AUTO_PREVIEW_POSITION_REGEX } = require('./constants');
const texRenderer = require('./texRenderer');

/**
 * Parses and extracts the effective max-height value and unit from a CSS string
 * @param {string} cssString - CSS declaration string containing multiple rules
 * @returns { {MaxHeightValue: number, Unit: string} | null } - Parsed value/unit 
 * object, returns null if no valid value found. Supported units: em/rem/px/%/vw/
 * vh
 * @example
 * Returns { MaxHeightValue: 64, Unit: "px" }
 * getMaxHeightValueAndUnit("max-height: 80vh; max-height: 64px !important;")
 */
function getMaxHeightValueAndUnit(cssString) {
    // 1. Extract and parse all max-height declarations
    const declarations = cssString
        .split(AUTO_PREVIEW_POSITION_REGEX.css_split)
        .map(rule => rule.trim())
        .filter(rule => AUTO_PREVIEW_POSITION_REGEX.max_height.test(rule))
        .map((rule, index) => {
            const [, value] = rule.split(AUTO_PREVIEW_POSITION_REGEX.valuesplit);
            const IsImportant = AUTO_PREVIEW_POSITION_REGEX.isImportant.test(value);
            const cleanValue = value.replace(AUTO_PREVIEW_POSITION_REGEX.cleanValue, '').trim();
            return {
                value: cleanValue,
                priority: IsImportant ? 1 : 0,
                index
            };
        });

    if (!declarations.length) return null;

    // 2. Sort by priority and order of occurrence
    declarations.sort((a, b) =>
        b.priority - a.priority || b.index - a.index
    );

    // 3. Parse the units and numeric values of valid values
    const value = declarations[0].value;
    const match = value.match(AUTO_PREVIEW_POSITION_REGEX.unit);

    if (!match) return null;

    return {
        MaxHeightValue: parseFloat(match[1]),
        Unit: match[2].toLowerCase()
    };
}

/**
 * Asynchronously renders a mathematical expression to an SVG string,
 * converts the SVG's height from `ex` units to `em` units (assuming a 1:2 ratio),
 * and returns the rounded up result.
 *
 * @async
 * @function renderAndGetHeightInEm
 * @returns {number|undefined} The SVG's height in `em` units (rounded up)
 *                             or undefined if an error occurs during rendering.
 */
async function renderAndGetHeightInEm(mathExpression, isDisplayMath, rendererConfig) {
    let svgHeightInEm;
    try {
        const svgString = await texRenderer[rendererConfig](mathExpression, isDisplayMath);
        if (!svgString.includes("error")) {
            /**
             * Assumes the SVG height is given in `ex` units and converts it to `em` units
             * by dividing by 2 (since 1 `em` is assumed to be twice the size of 1 `ex` here).
             * The result is then rounded up using Math.ceil to ensure it is a whole number.
             */
            svgHeightInEm = Math.ceil(getSvgHeight(svgString) / 2);
        }
    } catch (error) {
        console.error("Rendering failed:", error);
    }
    return svgHeightInEm;
}

function getSvgHeight(svgString) {
    // Resolve the explicit height property
    const heightMatch = svgString.match(AUTO_PREVIEW_POSITION_REGEX.svg_height);
    return heightMatch ? parseFloat(heightMatch[1]) : 24;// If not found, return the default value
}

module.exports = {
    getMaxHeightValueAndUnit,
    renderAndGetHeightInEm,
    getSvgHeight
};