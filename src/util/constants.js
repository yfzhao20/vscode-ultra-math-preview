"use strict";

const defaultCSS = {
    maxheight: 'max-height: 45em;',
    OtherCSS: 'position: absolute;\
    padding: 0.5em;\
    display: inline-block;\
    z-index: 1;\
    pointer-events: auto;\
    background-color: var(--vscode-editor-background);\
    border: 0.5px solid var(--vscode-editorWidget-border);'
}

const SVG_REPLACE_REGEX = {
    style: /(?<=style\s*=\s*)"/,
    container: /<mjx-container[^<]*><svg/,
    endContainer: /<\/mjx-container>/
}

const MATH_REPLACE_REGEX = {
    delimiter: /\$\$|\$|\\\[|\\\(|\\begin\{math\}|\\begin\{displaymath\}/,
    blankFormula: /^\s*$/,
    blockquote: /[\n\r]([ \s]*>)+/g,
}

const AUTO_PREVIEW_POSITION_REGEX = {
    svg_height: /height\s*=\s*["']([^%]+?)["']/i,
    unit: /^([+-]?(?:\d*\.)?\d+)(rem|em|px|%|vw|vh)$/i,
    max_height: /^max-height\s*:/i,
    css_split: /;(?![^(]*\))/,
    valuesplit: /:\s*/i,
    isImportant: /\b!important\s*$/i,
    cleanValue: /\s*!important\s*$/i
}

const DELIMITER_REGEX = {
    beginDisplayMath:[["$$", "\\[", "\\("], ["$$", "\\[", "\\(", "\\begin{equation}", "\\begin{equation*}", "\\begin{align}", "\\begin{align*}", "\\begin{gather}", "\\begin{gather*}", "\\begin{displaymath}", "\\begin{math}"]],
    endDisplayMath:[["$$", "\\]", "\\)"], ["$$", "\\]", "\\)", "\\end{equation}", "\\end{equation*}", "\\end{align}", "\\end{align*}", "\\end{gather}", "\\end{gather*}", "\\end{displaymath}", "\\end{math}"]],
    beginInlineMath : [["$", "\\("], ["$", "\\(", "\\begin{math}"]],
    endInlineMath :[["$", "\\)"], ["$", "\\)", "\\end{math}"]]
}

module.exports = {
    defaultCSS,
    SVG_REPLACE_REGEX,
    MATH_REPLACE_REGEX,
    AUTO_PREVIEW_POSITION_REGEX,
    DELIMITER_REGEX
};