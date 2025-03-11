"use strict";

const { PreviewState, temp } = require('../index');
const { setPreview, _setPreview } = require('../features/setpreview');
const { reLocatingPreview, _reLocatingPreview } = require('../features/relocatingpreview');
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
            if (!e) return;
            const { document, selections } = e.textEditor;
            const activePosition = selections[0]?.active;
            const setPreviewFunc =
                PreviewState.config.debounceTime == 0 ? _setPreview : setPreview;
            setPreviewFunc(document, activePosition);
            temp.selections = selections;
        },

        onVisibleRangesChange() {
            if (PreviewState.config.autoAdjustPosition && temp.svgString) {
                const reLocatingFunc =
                    PreviewState.config.debounceTime == 0 ? _reLocatingPreview : reLocatingPreview;
                reLocatingFunc(temp.svgString);
            }
        }
    }
};