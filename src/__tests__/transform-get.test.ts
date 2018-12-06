import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import transformer from '../transform-get';

const printer = ts.createPrinter();

function getSourceFile(content: string): ts.SourceFile {
    return ts.createSourceFile('filename.ts', content, ts.ScriptTarget.Latest);
}

function expectSnapshot(filename: string) {
    const content = fs.readFileSync(path.resolve(__dirname, 'get', filename), 'utf8');
    const sourceFile = getSourceFile(content);
    const source = printer.printFile(sourceFile);
    const transformedFile = ts.transform(sourceFile, [transformer]).transformed[0];
    const transformed = printer.printFile(transformedFile).trim();

    const snapshot = {
        type: 'transform-baseline',
        filename,
        content,
        source,
        transformed
    };

    expect(snapshot).toMatchSnapshot();
}

const files = fs.readdirSync(path.resolve(__dirname, 'get'), 'utf8');

describe('transform-get tests', () => {
    files.forEach((filename) => {
        test(filename, () => expectSnapshot(filename));
    });
});
