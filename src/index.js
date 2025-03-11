"use strict";

// global variables
// from setpreview to relocatingpreview
const temp = {
    svgString: null,
    height: null,
    beginInfo: null,
    endInfo: null,
    selections: null,
    IsMathScope: null
}

// State management objects
const PreviewState = {
    decorationArray: [],
    macrosString: "",
    config: {
        macro: null,
        enablePreview: false,
        autoAdjustPosition: false,
        debounceTime: 0,
        position: null,
        renderer: null,
        enableCursor: false,
        cursorType:null,
        css: ""
    },
    ERROR: {
        occurred: false,
        reset: false
    }
}

module.exports = {
    temp,
    PreviewState
};