module.exports = {
    test: (obj) => obj && obj.type === 'transform-baseline',
    print: (obj, print, indent) => `File: ${obj.filename}
##################### Source code #####################
${indent(obj.content)}

############# TypeScript before transform #############
${indent(obj.source)}

############# TypeScript after transform ##############
${indent(obj.transformed)}`
};


