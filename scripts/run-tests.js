#!/usr/bin/env node

/**
 * Wrapper para executar testes com suporte a TypeScript
 */
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'es2015',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    moduleResolution: 'node',
  },
});

require('./test-all-services.js');
