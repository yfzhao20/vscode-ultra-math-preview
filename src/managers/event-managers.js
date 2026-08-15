"use strict";

const { PreviewState, temp } = require('../index');
const { setPreview } = require('../features/setpreview');
const { reLocatingPreview } = require('../features/relocatingpreview');
const { MacroProcessor } = require('../util/get-macros');
const { clearPreview } = require('../util/pushpreview');

module.exports = {
    // Event Processor
    EventHandlers: {
        withPreviewCheck(handler) {
            return (...args) => PreviewState.config.enablePreview && handler(...args);
        },

        onActiveEditorChange(e) {
            clearPreview();
            if (e) MacroProcessor.update(e.document);
        },

        onSelectionChange(e) {
            if (!e) return;
            const { document, selections } = e.textEditor;
            const activePosition = selections[0]?.active;
            setPreview(document, activePosition, e.textEditor);
            temp.selections = selections;
        },

        onVisibleRangesChange(e) {
            if (PreviewState.config.autoAdjustPosition && temp.previewSnapshot) {
                reLocatingPreview(temp.previewSnapshot, e?.textEditor);
            }
        }
    }
};
