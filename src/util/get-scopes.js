"use strict";

const vscode = require('vscode');

const hscopes = vscode.extensions.getExtension('yfzhao.hscopes-booster');

function getScope(document, position) {
    if (!hscopes || !document || !position){
        console.log(`function "getScope" causes error.`)
        return undefined
    }
    else {
        return  hscopes?.exports?.getScopeAt(document, position)?.scopes ;
    }
}

function getScopeRange(document, position) {
    if (!hscopes || !document || !position){
        console.log(`function "getScopeRange" causes error.`)
        return undefined
    }
    else {
        return  hscopes?.exports?.getScopeAt(document, position)?.range ;
    }
}

function getMathScope(document, position) {
    let isInBeginDelimiter = false;
    let isInEndDelimiter = false;
    let isDisplayMath = false; 

    // get scope 
    const scope =  getScope(document, position)?.toString() ?? undefined;
    const scopeRange = getScopeRange(document, position)

    // not in math environment || can't get 'dravin.hscopes' extension
    if (!scope || scope.indexOf('math') === -1) return undefined

    // get isDisplayMath
    if (document.languageId === 'latex') {
        isDisplayMath = !!scope.match(/math\.block\.environment/)
    }
    else if (document.languageId === 'markdown') {
        isDisplayMath = !!scope.match(/math\.block|math\.display/)
    }
    else { return undefined }

    // get delimiter

    if (document.languageId === 'latex') {
        if (scope.indexOf("definition.string.begin") !== -1) {          // inBeginDelimiter
            isInBeginDelimiter = true
        }
        else if (scope.indexOf("definition.string.end") !== -1) {       // inEndDelimiter
            const isFirstChar = (position.line === scopeRange.start.line && position.character === scopeRange.start.character)
            isInEndDelimiter = !isFirstChar
        }

    }
    else if (document.languageId === 'markdown' && scope.indexOf("definition.math") !== -1) { // in delimiters!!!
        const isFirstChar = (position.line === scopeRange.start.line && position.character === scopeRange.start.character)
        if (isFirstChar) {
            // (0,0) => true
            if (!position.character && !position.line) {isInBeginDelimiter = true;}
            // test previous character
            else {
            const previousPosition = !!position.character 
                                ? new vscode.Position(position.line,position.character-1) 
                                : document.lineAt(position.line-1).range.end;
            const previousPositionScope = getScope(document,previousPosition).toString()
            isInBeginDelimiter = !(previousPositionScope.indexOf("math") !== -1 || scope.indexOf("definition.math.end") !== -1) 
                                || previousPositionScope.indexOf("definition.math.end") !== -1
            }
        }
        else {
            // TODO: identify begin-delimiter and end delimiter
            isInEndDelimiter = true  // BUG: mix begin-delimiter and end-delimiter
            isInBeginDelimiter = scope.indexOf("definition.math.end") === -1
        }
    }

    return {
        scope,
        isDisplayMath,
        isInBeginDelimiter,
        isInEndDelimiter
    }
}

/// TODO: return match delimiters

module.exports = {
    getScope,
    getScopeRange,
    getMathScope,
}