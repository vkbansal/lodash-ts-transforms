import * as ts from 'typescript';
import { toPath } from 'lodash';

type ArrayPath = Array<ts.StringLiteral | ts.NumericLiteral | ts.Identifier>;

function createPropertyAccessExpression(accesor: ts.Expression, path: ArrayPath): ts.Expression {
    if (path.length === 0) {
        return accesor;
    }

    let current = path[path.length - 1];

    /**
     * Numeric key must create array syntax
     * example: a[0]
     */
    if (ts.isNumericLiteral(current)) {
        return ts.createElementAccess(
            createPropertyAccessExpression(accesor, path.slice(0, -1)),
            current
        );
    }

    /**
     * string key must create dot syntax
     * example: a.b
     */
    if (ts.isStringLiteral(current)) {
        const t = parseFloat(current.text);

        // we may also get number as strings
        if (!Number.isNaN(t)) {
            return ts.createElementAccess(
                createPropertyAccessExpression(accesor, path.slice(0, -1)),
                t
            );
        }

        return ts.createPropertyAccess(
            createPropertyAccessExpression(accesor, path.slice(0, -1)),
            current.text
        );
    }

    /**
     * Dynamic key must create array syntax
     * example: a[b]
     */
    return ts.createElementAccess(
        createPropertyAccessExpression(accesor, path.slice(0, -1)),
        current
    );
}

function createAndBinaryExpression(accesor: ts.Expression, path: ArrayPath): ts.Expression {
    if (path.length === 0) {
        return accesor;
    }

    return ts.createBinary(
        createAndBinaryExpression(accesor, path.slice(0, -1)),
        ts.SyntaxKind.AmpersandAmpersandToken,
        createPropertyAccessExpression(accesor, path)
    );
}

function convertCallExpressionToBinaryExpression(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile
): ts.Node {
    const hasDefaultValue = node.arguments.length === 3;
    const [accesorObject, pathArg] = node.arguments;
    let path: ArrayPath = [];

    if (ts.isArrayLiteralExpression(pathArg)) {
        path = (pathArg as ts.ArrayLiteralExpression).elements.slice(0) as ArrayPath;
    }

    if (ts.isStringLiteral(pathArg)) {
        path = toPath(pathArg.text).map((a) => {
            const t = parseFloat(a);

            if (!Number.isNaN(t)) return ts.createNumericLiteral(a);

            return ts.createStringLiteral(a);
        });
    }

    return createAndBinaryExpression(accesorObject, path);
}

function checkGetArguments(node: ts.CallExpression): boolean {
    const correctNumberofArgs = node.arguments.length === 2 || node.arguments.length === 3;

    if (!correctNumberofArgs) return false;

    const pathArg = node.arguments[1];
    const isValidPathArray =
        ts.isArrayLiteralExpression(pathArg) &&
        (pathArg as ts.ArrayLiteralExpression).elements.every(
            (elem) => ts.isNumericLiteral(elem) || ts.isStringLiteral(elem) || ts.isIdentifier(elem)
        );
    const isValidPathString = ts.isStringLiteral(pathArg);

    return isValidPathArray || isValidPathString;
}

export default function transformer(context: ts.TransformationContext) {
    return function(sourceFile: ts.SourceFile) {
        if (sourceFile.isDeclarationFile) return sourceFile;

        let isGetImported = false;

        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
            if (ts.isImportDeclaration(node)) {
                const importDeclaration = node as ts.ImportDeclaration;

                if (importDeclaration.importClause) {
                    const { name, namedBindings } = importDeclaration.importClause;
                    const moduleSpecifier = (importDeclaration.moduleSpecifier as any).text.trim();

                    if (name && name.text === 'get' && moduleSpecifier === 'lodash/get') {
                        isGetImported = true;
                    }

                    if (namedBindings && moduleSpecifier === 'lodash') {
                        if (ts.isNamedImports(namedBindings)) {
                            isGetImported = namedBindings.elements.some(
                                (binding) => binding.name.getFullText(sourceFile).trim() === 'get'
                            );
                        }
                    }
                }

                return node;
            }

            if (ts.isCallExpression(node)) {
                const callExpression = node as ts.CallExpression;

                if (
                    isGetImported &&
                    callExpression.expression.getFullText(sourceFile).trim() === 'get' &&
                    checkGetArguments(node)
                ) {
                    return convertCallExpressionToBinaryExpression(callExpression, sourceFile);
                } else {
                    return node;
                }
            }

            return ts.visitEachChild(node, visitor, context);
        }

        return ts.visitNode(sourceFile, visitor);
    };
}
