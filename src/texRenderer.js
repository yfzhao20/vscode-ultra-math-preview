"use strict";

// Preload MathJax, See https://github.com/mathjax/MathJax-demos-node/tree/master/preload
this.MathJax = {
    options: { enableAssistiveMml: false },
    svg: { fontCache: 'local' },
    startup: { typeset: false }
};

require('mathjax/es5/startup');
require('mathjax/es5/core');
require('mathjax/es5/adaptors/liteDOM');
require('mathjax/es5/input/tex-full');
require('mathjax/es5/output/svg');
require('mathjax/es5/output/svg/fonts/tex');

MathJax.loader.preLoad(
    'core',
    'adaptors/liteDOM',
    'input/tex-full',
    'output/svg',
    'output/svg/fonts/tex'
    );
MathJax.config.startup.ready();

const mathjaxRenderer = async (tex, isBlock = true) => {
    // enable render \\ as line break
    if (isBlock) tex = `\\displaylines{${tex}}`;
    
    const node = await MathJax.tex2svgPromise(tex, {display: isBlock});
    const svg = MathJax.startup.adaptor.innerHTML(node);

    // clear && remove package from \requrie{}
    MathJax.startup.document.clear();
    MathJax.config.startup.ready();

    return svg;
}

module.exports = {
    mathjax: mathjaxRenderer
}