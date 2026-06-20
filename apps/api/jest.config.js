/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@coclerk/domain$': '<rootDir>/../../packages/domain/src/index.ts',
    '^@coclerk/database$': '<rootDir>/../../packages/database/src/index.ts',
    '^@coclerk/config$': '<rootDir>/../../packages/config/src/index.ts',
    '^@coclerk/workflow-engine$': '<rootDir>/../../packages/workflow-engine/src/index.ts',
  },
};
