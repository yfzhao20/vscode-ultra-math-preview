"use strict";

/**
 * Inserts text at a VS Code document position within an extracted source range.
 *
 * `TextDocument.offsetAt` and JavaScript string indexes both use UTF-16 code
 * units. Taking the difference between two document offsets therefore keeps
 * the position correct across lines, CRLF line endings, and surrogate pairs.
 *
 * @param {import('vscode').TextDocument} document The source document.
 * @param {string} sourceText Text returned for the source range.
 * @param {import('vscode').Position} rangeStart Start of the source range.
 * @param {import('vscode').Position} position Position at which to insert.
 * @param {string} insertion Text to insert.
 * @returns {string} The source text with the insertion, or the original text
 * when the position lies outside the extracted range.
 */
function insertTextAtDocumentPosition(document, sourceText, rangeStart, position, insertion) {
    const relativeOffset = document.offsetAt(position) - document.offsetAt(rangeStart);

    if (relativeOffset < 0 || relativeOffset > sourceText.length) {
        return sourceText;
    }

    return sourceText.slice(0, relativeOffset)
        + insertion
        + sourceText.slice(relativeOffset);
}

module.exports = {
    insertTextAtDocumentPosition
};
