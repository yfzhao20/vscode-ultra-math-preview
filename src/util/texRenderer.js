"use strict";

const katex = require('katex');
require('katex/contrib/mhchem');

// Preload MathJax, See https://github.com/mathjax/MathJax-demos-node/tree/master/preload
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

    const node = await MathJax.tex2svgPromise(tex, { display: isBlock });
    const svg = MathJax.startup.adaptor.innerHTML(node);

    // Parse the SVG string to get the height
    /** 
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;
    const height = svgElement.getAttribute('height');
    */


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

    const node = await MathJax.mathml2svgPromise(mml, { display: isBlock });
    const svg = MathJax.startup.adaptor.innerHTML(node);

    // Parse the SVG string to get the height
        /**
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;
    const height = svgElement.getAttribute('height');
    */

    MathJax.startup.document.clear();

    return svg;
}
module.exports = {
    mathjax: mathjaxRenderer,
    katex: katexRenderer
}