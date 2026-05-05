const { register } = require('ts-node');

// Register ts-node with CommonJS override to allow importing .ts files
// even if the project is configured for ESNext.
register({
    compilerOptions: {
        module: 'CommonJS',
        esModuleInterop: true,
    },
    transpileOnly: true,
});

// Execute the seed script
require('./seed.ts');
