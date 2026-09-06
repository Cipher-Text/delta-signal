/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/test/specs/**/*.e2e-spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  // Same CJS stubs as the unit-test config — bullmq ships as pure ESM.
  moduleNameMapper: {
    '^@nestjs/bullmq$': '<rootDir>/__mocks__/@nestjs/bullmq.js',
    '^bullmq$': '<rootDir>/__mocks__/bullmq.js',
    '^@delta-signal/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@delta-signal/contracts$': '<rootDir>/../../packages/contracts/src/index.ts',
  },
  // Load test env vars in every worker before any module is imported.
  setupFiles: ['<rootDir>/test/env-setup.js'],
  clearMocks: true,
  // E2E tests spin up the full NestJS app and seed the database — allow more time.
  testTimeout: 60_000,
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.e2e.json' }],
  },
};
