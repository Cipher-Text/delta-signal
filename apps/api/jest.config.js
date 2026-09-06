/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  // bullmq and @nestjs/bullmq ship as pure ESM ("type":"module") with no CJS
  // build. Map them to hand-written CJS stubs so the Jest CJS loader can
  // require them. Tests mock the services that use queues anyway.
  moduleNameMapper: {
    '^@nestjs/bullmq$': '<rootDir>/../__mocks__/@nestjs/bullmq.js',
    '^bullmq$': '<rootDir>/../__mocks__/bullmq.js',
    // tsconfig.base.json path aliases — ts-jest does not read them itself.
    '^@delta-signal/shared$': '<rootDir>/../../../packages/shared/src/index.ts',
    '^@delta-signal/contracts$': '<rootDir>/../../../packages/contracts/src/index.ts',
  },
  clearMocks: true,
  collectCoverageFrom: ['**/*.ts', '!**/*.module.ts', '!main.ts'],
};
