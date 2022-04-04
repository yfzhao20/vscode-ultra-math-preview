"use strict";

const katex = require('katex');
require('katex/contrib/mhchem');

// Preload MathJax, See https://github.com/mathjax/MathJax-demos-node/tree/master/preload
this.MathJax = {
    options: { enableAssistiveMml: false },
    svg: { fontCache: 'local' },
    startup: { typeset: false }
};

require('mathjax-full/components/src/startup/startup');
require('mathjax-full/components/src/core/core');
require('mathjax-full/components/src/adaptors/liteDOM/liteDOM');
require('mathjax-full/components/src/input/mml/mml');
require('mathjax-full/components/src/input/tex-full/tex-full');
require('mathjax-full/components/src/output/svg/svg');
require('mathjax-full/components/src/output/svg/fonts/tex/tex');

MathJax.loader.preLoad(
    'core',
    'adaptors/liteDOM',
    'input/mml',
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

const katexRenderer = async (tex, isBlock = true) => {
    const mml = katex.renderToString(tex, {
        displayMode: isBlock,
        output: 'mathml',
        throwOnError: false
    }).slice(20, -7);

    const node = await MathJax.mathml2svgPromise(mml, {display: isBlock});
    const svg = MathJax.startup.adaptor.innerHTML(node);

    MathJax.startup.document.clear();

    return svg;
}
module.exports = {
    mathjax: mathjaxRenderer,
    katex: katexRenderer
}