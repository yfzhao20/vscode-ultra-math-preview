"use strict";

const vscode = require('vscode');
const hscopes = vscode.extensions.getExtension('yfzhao.hscopes-booster');

// Caches the most recent scoping results
let lastScopeCache = null;

/**
 * Gets the cached math scope for the given document and position.
 * @param {vscode.TextDocument} document - The document to get the scope from.
 * @param {vscode.Position} position - The position in the document to get the scope at.
 * @returns {Object | undefined} - The cached math scope information.
 */
function getCachedMathScope(document, position) {
    const key = `${document.uri.toString()}:${position.line}:${position.character}`;
    if (!lastScopeCache || lastScopeCache.key !== key) {
        lastScopeCache = {
            key,
            value: getMathScope(document, position)
        };
    }
    return lastScopeCache.value;
}

/**
 * Gets the math scope for the given document and position.
 * @param {vscode.TextDocument} document - The document to get the scope from.
 * @param {vscode.Position} position - The position in the document to get the scope at.
 * @returns {Object | undefined} - The math scope information.
 */
function getMathScope(document, position) {
    if (!document.languageId.match(/latex|markdown/))
        return undefined

    let isInBeginDelimiter = false;
    let isInEndDelimiter = false;
    let isDisplayMath = false;
    // get scope 
    const scopeInfo = getScope(document, position)
    const scope = scopeInfo?.scopes?.toString();
    const scopeRange = scopeInfo?.range;

    // not in math environment || can't get 'dravin.hscopes' extension
    // get isDisplayMath
    if (scope?.includes("support.class.math")) {
        isDisplayMath = scope.includes("math.block.environment")
    }
    else if (scope?.includes("markup.math") || scope?.includes("markup.inserted.math")) {
        isDisplayMath = scope.includes("math.block") || scope.includes("math.display")
    }
    else {
        return undefined
    }

    // get delimiter
    if (scope.includes("definition.string.begin")) {          // inBeginDelimiter
        isInBeginDelimiter = true
    }
    else if (scope.includes("definition.string.end")) {       // inEndDelimiter
        isInEndDelimiter = !position.isEqual(scopeRange.start)
    }
    else if (document.languageId === 'markdown' && scope.includes("definition.math")) { // in delimiters!!!
        if (position.isEqual(scopeRange.start)) {
            // (0,0) => true
            if (!position.character && !position.line)
                isInBeginDelimiter = true;
            // test previous character
            else {
                const previousPosition = !!position.character
                    ? new vscode.Position(position.line, position.character - 1)
                    : document.lineAt(position.line - 1).range.end;
                const previousPositionScope = getScope(document, previousPosition).scopes.toString()
                isInBeginDelimiter = !(previousPositionScope.includes("math") || scope.includes("definition.math.end"))
                    || previousPositionScope.includes("definition.math.end")
            }
        }
        else {
            isInEndDelimiter = true  // BUG: mix begin-delimiter and end-delimiter
            isInBeginDelimiter = !scope.includes("definition.math.end")
        }
    }
    return {
        scope,
        isDisplayMath,
        isInBeginDelimiter,
        isInEndDelimiter
    }
}

/**
 * Gets the TextMate scope for the given document and position.
 * @param {vscode.TextDocument} document - The document to get the scope from.
 * @param {vscode.Position} position - The position in the document to get the scope at.
 * @returns {string[] | undefined} - The TextMate scope information.
 */
function getScope(document, position) {
    if (!hscopes || !document || !position) {
        console.log(`function "getScope" causes error.`)
        return undefined
    }
    return hscopes?.exports?.getScopeAt(document, position);
}

/**
 * Checks if the given scope is a valid math scope.
 * @param {Object} scope - The scope to check.
 * @returns {boolean} - True if the scope is valid, false otherwise.
 */
function isValidMathScope(scope) {
    return scope && !scope.isInBeginDelimiter && !scope.isInEndDelimiter;
}

/// TODO: return match delimiters

module.exports = {
    getCachedMathScope,
    getMathScope,
    isValidMathScope
}