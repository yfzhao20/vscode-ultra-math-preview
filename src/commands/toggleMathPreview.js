"use strict";
const vscode = require('vscode');
const { setPreview } = require('../features/setpreview')
const { PreviewState } = require('../index')
const { clearPreview } = require('../util/pushpreview')
const { getMacros } = require('../util/get-macros')

function toggleMathPreview() {
    vscode.workspace.getConfiguration().update('umath.preview.enableMathPreview', !PreviewState.config.enablePreview, true)
    PreviewState.config.enablePreview = !PreviewState.config.enablePreview
    clearPreview();
    if (!PreviewState.config.enablePreview)
        return;
    const editor = vscode?.window?.activeTextEditor;
    PreviewState.macrosString = getMacros(editor?.document, PreviewState.config.macro)?.join('\n') ?? ""
    setPreview(editor?.document, editor?.selection?.active);
}

module.exports = {
    toggleMathPreview
};