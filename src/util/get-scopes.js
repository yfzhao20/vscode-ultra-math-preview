"use strict";

const vscode = require('vscode');
const hscopes = vscode.extensions.getExtension('draivin.hscopes');

// TODO: if (hscopes.notfound) {prompt; return}

function getScope(document, position) {
    return hscopes.exports.getScopeAt(document, position).scopes;
}

/// TODO: Add function for determining environment.

/// TODO: return match brackets

module.exports = {
    getScope
}