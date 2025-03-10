# Ultra Math Preview for VS Code

<img alt="Visual Studio Marketplace Installs" src="https://img.shields.io/visual-studio-marketplace/i/yfzhao.ultra-math-preview">  <img alt="Visual Studio Marketplace Version" src="https://img.shields.io/visual-studio-marketplace/v/yfzhao.ultra-math-preview">  <img alt="GitHub" src="https://img.shields.io/github/license/yfzhao20/vscode-ultra-math-preview">

Real-time math preview for LaTeX and markdown. Powered by `MathJax` and `KaTeX`.

## Usage

Install this extension, and then put your cursor into math block in *markdown(.md)* or *latex(.tex)* file. Then you will get real-time preview:

![](https://raw.githubusercontent.com/yfzhao20/vscode-ultra-math-preview/main/image/test1.gif)

And when you input math formula, the preview will update:

![](https://raw.githubusercontent.com/yfzhao20/vscode-ultra-math-preview/main/image/test2.gif)


Enjoy and rate five-stars ⭐⭐⭐⭐⭐ ~

## Configurations & Commands

- You can define macros and ⚠ MANUALLY update by executing `umath.preview.reloadMacros` (*Ultra Math Preview: Reload Macros*). "Automatically updating macros" has been disabled, because it can affect peformance.

![](https://raw.githubusercontent.com/yfzhao20/vscode-ultra-math-preview/main/image/macro2.gif)

- Or you can set macros in `setting.json`

![](https://raw.githubusercontent.com/yfzhao20/vscode-ultra-math-preview/main/image/macro1.gif)

- You can use command `umath.preview.toggleMathPreview`(*Ultra Math Preview: Toggle Math Preview*) to enable or disable math preview.

- Background color and foreground color will change with Theme. If it goes invalid, execute `umath.preview.reloadPreview`(*Ultra Math Preview: Reload Preview*) Command.

- You can set preview panel on the top/bottom of math block by `umath.preview.position` (*Umath &gt; Preview: Position*) option.

- You can set whether you want to adjust the position of the math formula preview in real time by `umath.preview.AutoAdjustPreviewPosition`, and how fast the math formula preview is updated by `umath.preview.DebounceTime`.

![](https://raw.githubusercontent.com/yfzhao20/vscode-ultra-math-preview/main/image/AutoAdjustPreviewPosition.gif)

- You can set whether (`umath.preview.EnableCursor`) and how (`umath.preview.CursorType`) you want the mouse position to be displayed in the math formula preview. Currently, only **hand-shaped emoji** (👆) and **black triangles** ($\blacktriangleright$) are supported

![](https://raw.githubusercontent.com/yfzhao20/vscode-ultra-math-preview/main/image/cursorposition.gif)

- You can set the renderer as `MathJax`/`KaTeX` by `umath.preview.renderer` (*Umath &gt; Preview: Renderer*).

- You can set Custom CSS in `umath.preview.customCSS` (*Umath &gt; Preview: Custom CSS*).

![](https://raw.githubusercontent.com/yfzhao20/vscode-ultra-math-preview/main/image/css.gif)

- You can press `Escape` to close live preview panel.

## Dependency

- Extension: **HyperScopes Booster** (*yfzhao.hscopes-booster*) 
    - to get TextMate scope of text.
    - now you can uninstall *draivin.hscopes* (**HyperScopes**) if no extension depends on that.
 
## Known Isseus
- Regarding the horizontal instability of the preview window.
    When **Automatically adjust preview position** is enabled, the preview window can not not exceed the text position boundaries. In contexts with excessive indentation or empty lines, the preview window may exhibit lateral oscillations (left-right swaying). Setting **position: absolute** for the **defaultCss** variable in the file `"./src/math-preview.js"` fails to resolve this issue, while alternative configurations like **fixed**  cannot guarantee stable preview performance under normal conditions.
- When I enable cursor position (`umath.preview.EnableCursor:true`), why sometimes mathpreview doesn't show up?
    The principle of inserting cursor positions in mathematical formulas is to insert specific symbols at the corresponding positions. In some places, carets cause formula compilation errors and do not output previews. Statements that are known to cause this error include `\left` and `\right`.

## Todo

- [ ] Added support for asciidoc|rmarkdown|jupyter.
- [x] Add `cursor` to "Position"(`umath.preview.position`) options.
- [x] Automatically adjust preview position.
- [x] Add `escape` keybinding for closing preview panel.
- [x] Support user-defined CSS style
- [x] Support more environments.
- [x] Fix alignment bug

## Debugging
- Install node.js(Version 18.0.0 recommended)
    
    Run `node -v` and `npm -v` to confirm the version.

- Run `npm run install` in the terminal to install **devDependencies** in the `"./package.json"`.

    **Version 3.2.0** is recommended for **mathjax-full**. Otherwise, an error message will be reported:**Cannot set property RequireLoad of #&lt;Object&gt; which has only a getter.**

- Run `npm run esbuild-watch`in the terminal.

- Open `./dist/extension.js` and press F5 (`".vscode/launch.json"` needs to be configured in advance).

## Acknowledgement
- Part of the code is generated based on the `DeepSeek-Coder`,such as the function `getMaxHeightValueAndUnit` in the `"./src/util/autoPreviewPosition.js"`