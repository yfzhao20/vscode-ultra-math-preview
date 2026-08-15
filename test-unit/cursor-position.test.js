"use strict";

const assert = require('assert');
const test = require('node:test');
const { insertTextAtDocumentPosition } = require('../src/util/cursor-position');

function createDocument(text) {
    const lineOffsets = [0];
    const lineBreak = /\r\n|\n|\r/g;
    let match;

    while ((match = lineBreak.exec(text)) !== null) {
        lineOffsets.push(match.index + match[0].length);
    }

    return {
        offsetAt(position) {
            return lineOffsets[position.line] + position.character;
        }
    };
}

test('inserts at the cursor in a single-line formula', () => {
    const document = createDocument('prefix $a+b$ suffix');

    assert.strictEqual(
        insertTextAtDocumentPosition(
            document,
            'a+b',
            { line: 0, character: 8 },
            { line: 0, character: 9 },
            '<cursor>'
        ),
        'a<cursor>+b'
    );
});

test('does not subtract the first-line range column on following lines', () => {
    const document = createDocument('prefix $$\n  a+b\n$$ suffix');

    assert.strictEqual(
        insertTextAtDocumentPosition(
            document,
            '\n  a+b\n',
            { line: 0, character: 9 },
            { line: 1, character: 4 },
            '<cursor>'
        ),
        '\n  a+<cursor>b\n'
    );
});

test('keeps the cursor aligned in an indented Markdown blockquote', () => {
    const document = createDocument('  > $$\n  > ab+c\n  > $$');

    assert.strictEqual(
        insertTextAtDocumentPosition(
            document,
            '\n  > ab+c\n  > ',
            { line: 0, character: 6 },
            { line: 1, character: 6 },
            '<cursor>'
        ),
        '\n  > ab<cursor>+c\n  > '
    );
});

test('uses the document offset for CRLF formulas', () => {
    const document = createDocument('prefix $$\r\n  a+b\r\n$$ suffix');

    assert.strictEqual(
        insertTextAtDocumentPosition(
            document,
            '\r\n  a+b\r\n',
            { line: 0, character: 9 },
            { line: 1, character: 4 },
            '<cursor>'
        ),
        '\r\n  a+<cursor>b\r\n'
    );
});

test('preserves UTF-16 cursor coordinates after astral characters', () => {
    const document = createDocument('prefix $x😀+y$ suffix');

    assert.strictEqual(
        insertTextAtDocumentPosition(
            document,
            'x😀+y',
            { line: 0, character: 8 },
            { line: 0, character: 11 },
            '<cursor>'
        ),
        'x😀<cursor>+y'
    );
});

test('leaves the expression unchanged for positions outside its range', () => {
    const document = createDocument('prefix $a+b$ suffix');

    assert.strictEqual(
        insertTextAtDocumentPosition(
            document,
            'a+b',
            { line: 0, character: 8 },
            { line: 0, character: 7 },
            '<cursor>'
        ),
        'a+b'
    );

    assert.strictEqual(
        insertTextAtDocumentPosition(
            document,
            'a+b',
            { line: 0, character: 8 },
            { line: 0, character: 12 },
            '<cursor>'
        ),
        'a+b'
    );
});

test('allows insertion at both boundaries of the expression', () => {
    const document = createDocument('prefix $a+b$ suffix');

    assert.strictEqual(
        insertTextAtDocumentPosition(
            document,
            'a+b',
            { line: 0, character: 8 },
            { line: 0, character: 8 },
            '<cursor>'
        ),
        '<cursor>a+b'
    );

    assert.strictEqual(
        insertTextAtDocumentPosition(
            document,
            'a+b',
            { line: 0, character: 8 },
            { line: 0, character: 11 },
            '<cursor>'
        ),
        'a+b<cursor>'
    );
});
