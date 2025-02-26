"use strict";

const vscode = require('vscode')

const { ConfigManager } = require('./managers/config-manager');
const { EventHandlers } = require('./managers/event-managers');
const { MacroProcessor } = require('./util/get-macros');
const { Commands } = require('./commands/commands');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    ConfigManager.updateAll();
    MacroProcessor.update(vscode.window.activeTextEditor?.document);

    context.subscriptions.push(
        ...Commands.map(([name, handler]) =>
            vscode.commands.registerCommand(
                name,
                name.includes('reloadPreview')
                    ? EventHandlers.withPreviewCheck(handler)
                    : handler
            )
        )
    );

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(EventHandlers.onActiveEditorChange),
        vscode.window.onDidChangeTextEditorSelection(
            EventHandlers.withPreviewCheck(EventHandlers.onSelectionChange)
        ),
        vscode.window.onDidChangeTextEditorVisibleRanges(EventHandlers.onVisibleRangesChange),
        vscode.workspace.onDidChangeConfiguration((e) => ConfigManager.handleConfigChange(e))
    );
}

module.exports = {
    activate
};