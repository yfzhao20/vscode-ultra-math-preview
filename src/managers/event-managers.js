"use strict";

const { PreviewState, temp } = require('../index');
const { setPreview } = require('../features/setpreview');
const { reLocatingPreview } = require('../features/relocatingpreview');
const { MacroProcessor } = require('../util/get-macros');

module.exports = {
    // Event Processor
    EventHandlers: {
        withPreviewCheck(handler) {
            return (...args) => PreviewState.config.enablePreview && handler(...args);
        },

        onActiveEditorChange(e) {
            if (e) MacroProcessor.update(e.document);
        },

        onSelectionChange(e) {
            if (e) {
                setPreview(e.textEditor.document, e.selections[0]?.active);
                temp.selections = e.selections;
            }
        },

        onVisibleRangesChange() {
            if (PreviewState.config.AutoAdjustPosition && temp.svgString) {
                reLocatingPreview(temp.svgString);
            }
        }
    }
};