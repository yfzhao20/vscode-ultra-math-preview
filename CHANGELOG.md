# Change Log

All notable changes to the "ultra-math-preview" extension will be documented in this file.

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