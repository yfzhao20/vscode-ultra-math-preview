"use strict";

const SVG_HEIGHT_REGEX = /height\s*=\s*["']([^%]+?)["']/i;
const UNIT_REGEX = /^([+-]?(?:\d*\.)?\d+)(rem|em|px|%|vw|vh)$/i;
const MAX_HEIGHT_REGEX = /^max-height\s*:/i;

module.exports = {
    getMaxHeightValueAndUnit,
    renderAndGetHeightInEm,
    getSvgHeight
};

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
        .split(/;(?![^(]*\))/)
        .map(rule => rule.trim())
        .filter(rule => MAX_HEIGHT_REGEX.test(rule))
        .map((rule, index) => {
            const [, value] = rule.split(/:\s*/i);
            const isImportant = /\b!important\s*$/i.test(value);
            const cleanValue = value.replace(/\s*!important\s*$/i, '').trim();
            return {
                value: cleanValue,
                priority: isImportant ? 1 : 0,
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
    const match = value.match(UNIT_REGEX);

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
async function renderAndGetHeightInEm(mathExpression, isDisplayMath, texRenderer, rendererConfig) {
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
    const heightMatch = svgString.match(SVG_HEIGHT_REGEX);
    return heightMatch ? parseFloat(heightMatch[1]) : 24;
}

function getSvgHeight(svgString) {
    // Resolve the explicit height property
    const heightMatch = svgString.match(SVG_HEIGHT_REGEX);
    return heightMatch ? parseFloat(heightMatch[1]) : 24;// If not found, return the default value
}