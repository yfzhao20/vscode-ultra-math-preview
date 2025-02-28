"use strict";
const vscode = require('vscode');
const { clearPreview } = require('../util/pushpreview');
const { setPreview } = require('../features/setpreview');
const { reloadMacros } = require('./reloadMacros');
const { toggleMathPreview } = require('./toggleMathPreview');

const Commands = [
    ['umath.preview.closeAllPreview', clearPreview],
    ['umath.preview.reloadMacros', reloadMacros],
    ['umath.preview.toggleMathPreview', toggleMathPreview],
    ['umath.preview.reloadPreview', () => {
        const editor = vscode.window.activeTextEditor;
        setPreview(editor?.document, editor?.selection?.active);
    }]
];

module.exports = {
    Commands
};