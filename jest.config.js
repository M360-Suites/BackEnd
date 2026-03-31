module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/tests/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/index.ts'],
  // Memory optimization options
  maxWorkers: '50%', // Reduce parallel workers
  workerIdleMemoryLimit: '512MB', // Limit memory per worker
  verbose: false,
  testTimeout: 30000,
  // Only run tests in CI, skip for pre-commit
  passWithNoTests: true,
};
