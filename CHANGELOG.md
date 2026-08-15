# Change Log

All notable changes to the "ultra-math-preview" extension will be documented in this file.

## [0.2.8]

- FIX: keep the preview cursor aligned in multiline, indented, CRLF, and Unicode formulas.
- FIX: prevent stale asynchronous renders and scroll relocation from restoring an old cursor position.
- FIX: apply debounce and auto-position configuration changes without restarting VS Code.

## [0.0.1] 

(*insider*)

- Initial demo
- render TeX from [codecogs test website](https://latex.codecogs.com/svg.latex?\frac{1}{3}) , then get *png* file.

## [0.0.2]

(*insider*)

- render TeX to SVG file with MathJax.

## [0.0.3]

(*insider*)

- Fix multi-preview bug

## [0.0.4]
(*insider*)

- delete test functions 

## [0.0.5]
(*insider*)

- moveout keybindings functions.

## [0.0.6]

- Fix unusual display in math delimiters

## [0.0.7]
## [0.0.8]

- Add icon of extension.

## [0.0.9]

- Partly fix preview bug in markdown block-quote environment
- Update icon

## [0.1.0]

- Fix preview bug in math delimiters.
- Auto reload preview on error.

## [0.1.1]

- Support User-defined macros.
- Support 'Reload macros' command.
- Support 'Toggle Math Preview' command.

## [0.1.2]

- Automatically change background-color and foreground-color when theme changes.

## [0.1.3]

- Partly fix "Command xxx not found" error
- Context menu improvements.

## [0.1.4]

- Partly fix issue#1 by forcibly let `\newcommand*` be `\newcommand`
- known issue: putting `\newcommand*` in math-blocks may cause error.

## [0.1.5]

- Change TextMate extension to `yfzhao.hscopes-booster` (HyperScopes Booster)
  - Now you can uninstall `draivin.hscopes` (HyperScopes) extension if no extension depends on that.

## [0.1.6]

- Fix a bug which may cause `Cannot read property 'scopes' of null` Error.

## [0.2.0]

**Ultra Math Preview is now 0.2.0 !🎉**

([#2](https://github.com/yfzhao20/vscode-ultra-math-preview/pull/2))
- NEW: new option "Position"(`umath.preview.position`). You can preview your formula on top/bottom of your code.
- NEW: support `KaTeX` renderer. You can toggle renderer with "Renderer"(`umath.preview.renderer`) option.
- FIX: fix conflict caused by MathJax. 
- Other: compress file with `esbuild` to reduce the size.
- Other: preload `MathJax` components when extension is activated.

Thanks to @Eumeryx .

## [0.2.1]

- FIX: fix a bug of `getMacros()` which may give wrong macros.
- NEW: Support more environments, such as `equation`.
- Other: Add more comments.
- Other: Remove "Automatically update macros" function.

## [0.2.2]

- FIX: fix a bug that may return wrong range in `markdown` file

## [0.2.3]

- FIX: fix alignment bug in LaTeX file
- Other: several enhancements.

<!-- 
作者英文太烂了，下面是详细的修复和新增：
- 重写字符串搜索逻辑 `searchSubStr()` ，结构更加简明，返回值添加 `null`。相应修改了跳转到定界符的函数。
- 获取数学范围时，将同时包含定界符，然后切去 `$$` 等 MathJax 不支持的定界符。
- 重写了识别空白公式的逻辑。
- 没了。`curson Position` 的选项下次加
-->

## [0.2.4]

- FIX: fix some typos
- NEW: <kbd>Escape</kbd> keybinding for closing preview panel. (With `when` clause)
- NEW: Add custom CSS support.
- Other: rewrite CSS string.
- Other: several enhancements.

<!-- 
- 更改了svg字符串处理逻辑，字符串处理效率提升 5000% （其实是填了之前的坑，这样字符串处理用时从 ~3 ms 降低到 ~100 us）
- 重写了自定义宏的处理逻辑
-->

## [0.2.5]

- NEW: add the option for adjusting preview position
- FIX: fix scroll bar issue
- Other: several enhancements.
- Other: update README

## [0.2.6]

- NEW: Add cursor position display

## [0.2.7]

- Fix: resolve custom macro malfunction in versions 0.2.5 and 0.2.6
