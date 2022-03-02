"use strict";

const vscode = require('vscode')
const mathPreview = require('./math-preview')

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    // TODO: active log. Delete this.
    console.log('Congratulations, your extension "UltraPreview" is now active!');

    // toggle math preview
    mathPreview.activate(context);

    // TODO: register 'when' clause
}


function deactivate(){};

module.exports = {
    activate,
    deactivate,
}