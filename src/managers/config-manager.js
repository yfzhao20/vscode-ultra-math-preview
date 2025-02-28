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
            AutoAdjustPosition: this.get('AutoAdjustPreviewPosition'),
            position: this.get('position'),
            renderer: this.get('renderer'),
            css: this.get('customCSS')?.join('') || ""
        };
    },

    handleConfigChange(event) {
        if (!event) return;

        const configMap = {
            'macros': 'macro',
            'enableMathPreview': 'enablePreview',
            'AutoAdjustPreviewPosition': 'AutoAdjustPosition',
            'position': 'position',
            'renderer': 'renderer',
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