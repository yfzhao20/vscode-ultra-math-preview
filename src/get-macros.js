"use strict";


function getMacros(document,config){
    let macrosArray = [];
    let macrosLineIndex = [];
    if (!document) return {macrosArray, macrosLineIndex}

    for (let index = 0; index < document.lineCount; index++) {
        let lineText = document.getText(document.lineAt(index).range)

        while (true) {
            let matchMacro = lineText.match(/(?<init>\\(?:new|renew|provide)command\**\s*(?:\\\w+|\{[\\\w]+\})(?:\s*\[\d+\]\s*){0,2})(\\\S+|\{(?<carry>.*)\})/)
            if(!matchMacro) break;
            if(!!matchMacro.groups.carry && matchMacro.groups.carry.indexOf("}")!== -1){
                let carry = matchMacro.groups.carry
                let init = matchMacro.groups.init
                let depth = 1
                for (let index = 0; index < carry.length; index++) {
                    const element = carry[index];
                    depth += (carry[index] === "{")
                    depth -= (carry[index] === "}")
                    if (!depth) {
                        matchMacro[0] = init + "{" + carry.substring(0,index)+"}"
                        break;
                    }
                }
            }
            macrosArray.push(matchMacro[0])
            lineText = lineText.substring(matchMacro[0].length-1)
            if (macrosLineIndex.indexOf(index) === -1) macrosLineIndex.push(index)
        }
    }

    macrosArray.push.apply(macrosArray, config || [])

    return {
        macrosArray,
        macrosLineIndex
    }
}


module.exports = {
    getMacros
}

