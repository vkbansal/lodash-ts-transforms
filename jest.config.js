module.exports = {
    moduleFileExtensions: ['js', 'ts', 'tsx'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    testMatch: ['**/?(*.)test.ts'],
    "snapshotSerializers": [
        "<rootDir>/src/__tests__/serializer.js"
      ]
};
