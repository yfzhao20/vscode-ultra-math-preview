"use strict";
const vscode = require('vscode')
/**
 * get macros in document
 * @param {vscode.TextDocument} document 
 * @param {string[]} config 
 * @returns 
 */
function getMacros(document,config){
    let macrosArray = [];
    if (!document) 
        return macrosArray
        
    for (let index = 0; index < document.lineCount; index++) {
        let lineText = document.getText(document.lineAt(index).range)

        while (true) {
            let matchMacro = lineText.match(/(?<init>\\(?:new|renew|provide)command)(?<star>\s*\*?\s*)(?<cmd>(?:\\\w+|\{[\\\w]+\})(?:\s*\[\d+\]\s*){0,2})(?<macro>\\\S+|\{(?<carry>.*)\})/)
            if(!matchMacro) 
                break;
            if(matchMacro.groups?.carry?.includes("}")){
                let carry = matchMacro.groups.carry
                let depth = 1
                for (let i = 0; i < carry.length; i++) {
                    depth += (carry[i] === "{");
                    depth -= (carry[i] === "}");
                    if (!depth) {
                        matchMacro.groups.macro =  "{" + carry.substring(0,i)+"}"
                        break;
                    }
                }
            }
            lineText = lineText.substring((matchMacro.groups.init + matchMacro.groups.star + matchMacro.groups.cmd + matchMacro.groups.macro).length - 1) // Fixed a bug that may cause lineText processing error.
            macrosArray.push(matchMacro.groups.init + matchMacro.groups.cmd + matchMacro.groups.macro)
        }
    }
    macrosArray.push(...config||[])   
    return macrosArray;    
}

module.exports = {
    getMacros
}

