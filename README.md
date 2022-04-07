# Ultra Math Preview for VS Code

<img alt="Visual Studio Marketplace Installs" src="https://img.shields.io/visual-studio-marketplace/i/yfzhao.ultra-math-preview">  <img alt="Visual Studio Marketplace Version" src="https://img.shields.io/visual-studio-marketplace/v/yfzhao.ultra-math-preview">  <img alt="GitHub" src="https://img.shields.io/github/license/yfzhao20/vscode-ultra-math-preview">

Real-time math preview for LaTeX and markdown.

## Usage

Install this extension, and then put your cursor into math block in *markdown(.md)* or *latex(.tex)* file. Then you will get real-time preview:

![](https://raw.githubusercontent.com/yfzhao20/vscode-ultra-math-preview/main/image/test1.gif)

And when you input math formula, the preview will update:

![](https://raw.githubusercontent.com/yfzhao20/vscode-ultra-math-preview/main/image/test2.gif)


Enjoy and rate five-stars ⭐⭐⭐⭐⭐ ~

## Configurations & Commands

- You can define macros and Ultra Math Preview will automatically update.

![](https://raw.githubusercontent.com/yfzhao20/vscode-ultra-math-preview/main/image/macro2.gif)

- Or you can set macros in `setting.json`

![](https://raw.githubusercontent.com/yfzhao20/vscode-ultra-math-preview/main/image/macro1.gif)

- You can use command `umath.preview.toggleMathPreview`(*Ultra Math Preview: Toggle Math Preview*) to enable or disable math preview.

- Background color and foreground color will change with Theme. If it goes invalid, execute `umath.preview.reloadPreview`(*Ultra Math Preview: Reload Preview*) Command.

- You can set preview panel on the top/bottom of math block by `umath.preview.position` (*Umath &gt; Preview: Position*) option.

- You can set the renderer as `MathJax`/`KaTeX` by `umath.preview.renderer` (*Umath &gt; Preview: Renderer*).

## Dependency

- Extension: **HyperScopes Booster** (*yfzhao.hscopes-booster*) 
    - to get TextMate scope of text.
    - now you can uninstall *draivin.hscopes* (**HyperScopes**) if no extension depends on that.
 
## Todo

- [ ] Support more environment
- [ ] Support user-defined CSS style
