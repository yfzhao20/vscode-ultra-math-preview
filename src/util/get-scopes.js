"use strict";

const vscode = require('vscode');
const hscopes = vscode.extensions.getExtension('draivin.hscopes');

function getScope(document, position) {
    if (hscopes === undefined){
        vscode.window.showErrorMessage(`can not get extension 'draivin.hscopes' `)
        return undefined
    }
    else {
        return  hscopes.exports.getScopeAt(document, position).scopes ;
    }
}

/// TODO: return match delimiters

module.exports = {
    getScope
}