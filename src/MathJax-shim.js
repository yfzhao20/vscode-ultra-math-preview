/*
* Inject `MathJax` global object.
* See https://esbuild.docschina.org/api/#inject
* 
* Info: package.json need `esbuild --inject:./src/MathJax-shim.js --define:global.MathJax=MathJax`
* See https://esbuild.docschina.org/api/#define
*/

export let MathJax = {};