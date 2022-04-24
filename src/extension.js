"use strict";

const vscode = require('vscode')
const mathPreview = require('./math-preview')

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Congratulations, your extension "UltraPreview" is now active!');
    mathPreview.activate(context);
}

function deactivate(){};

module.exports = {
    activate,
    deactivate,
}