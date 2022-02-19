"use strict";

const vscode = require('vscode');
const hscopes = require('./util/get-scopes');
const delimiter = require('./util/get-delimiter-position')


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// jump out of display math
	context.subscriptions.push(
		vscode.commands.registerCommand('mathkey.jumpOutOfMath', () => mathJump(delimiter.endInlineMath, delimiter.endDisplayMath)) ,
	)
}

///////////////////////////



// jump out
function mathJump(endInlineMath, endDisplayMath) {
	const editor = vscode.window.activeTextEditor
	const document = editor.document
	let position = editor.selection.active; // current position

	
	let scopes = hscopes.getScope(document, position).toString();

	// TODO: import isMathEnvironment from get-scopes.js
	// display math
	if (
		(document.languageId === 'latex' && scopes.indexOf("math.block.environment") !== -1) 
		||
		document.languageId === 'markdown' && (scopes.indexOf("math.block") !== -1 || scopes.indexOf("math.display") !== -1)
		){
		editor.insertSnippet(new vscode.SnippetString('\n'), delimiter.jumpToEndPosition(document, position, endDisplayMath).insertPosition)
		return;
	}
	// inline math
	else if (scopes.indexOf("math") !== -1) {
		editor.insertSnippet(new vscode.SnippetString(' '), delimiter.jumpToEndPosition(document, position, endInlineMath).insertPosition)
		return;
	}

	// default
	vscode.commands.executeCommand(vscode.extensions.getExtension('yzhang.markdown-all-in-one') && editor.document.languageId === 'markdown' ? 'markdown.extension.onCtrlEnterKey' : 'editor.action.insertLineAfter')

}


module.exports = {
	activate
}