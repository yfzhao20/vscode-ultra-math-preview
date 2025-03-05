"use strict";

const vscode = require('vscode');
const { clearPreview } = require('../util/pushpreview');
const { PreviewState } = require('../index')

const ConfigManager = {
    get(key) {
        return vscode.workspace.getConfiguration(`umath.preview`).get(key);
    },

    updateAll() {
        PreviewState.config = {
            macro: this.get('macros'),
            enablePreview: this.get('enableMathPreview'),
            autoAdjustPosition: this.get('AutoAdjustPreviewPosition'),
            debounceTime: this.get('DebounceTime'),
            position: this.get('position'),
            renderer: this.get('renderer'),
            enableCursor: this.get('EnableCursor'),
            cursorType: this.get("CursorType"),
            css: this.get('customCSS')?.join('') || ""
        };
    },

    handleConfigChange(event) {
        if (!event) return;

        const configMap = {
            'macros': 'macro',
            'enableMathPreview': 'enablePreview',
            'AutoAdjustPreviewPosition': 'AutoAdjustPosition',
            'DebounceTime':'DebounceTime',
            'position': 'position',
            'renderer': 'renderer',
            'EnableCursor': 'EnableCursor',
            'CursorType':'CursorType',
            'customCSS': 'css'
        };

        Object.entries(configMap).forEach(([key, prop]) => {
            if (event.affectsConfiguration(`umath.preview.${key}`)) {
                PreviewState.config[prop] = key === 'customCSS'
                    ? this.get(key)?.join('') || ""
                    : this.get(key);
            }
        });

        if (!PreviewState.config.enablePreview) {
            clearPreview();
        }
    }
}

module.exports = {
    ConfigManager
};