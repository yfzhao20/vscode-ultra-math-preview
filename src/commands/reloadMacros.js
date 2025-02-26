"use strict";
const vscode = require('vscode');
const { getMacros } = require('../util/get-macros')
const { setPreview } = require('../features/setpreview')
const { PreviewState }=require('../index')

function reloadMacros() {
    if (!PreviewState.config.enablePreview)
        return;
    PreviewState.config.macro = vscode.workspace.getConfiguration().get('umath.preview.macros')
    const editor = vscode.window?.activeTextEditor;
    PreviewState.macrosString = getMacros(editor?.document, PreviewState.config.macro.macro)?.join('\n') ?? ""
    setPreview(editor?.document, editor?.selection?.active);
}

module.exports = {
    reloadMacros
};
