module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/?(*.)+(spec|test).ts'],

  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },

  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/scripts/**',
    '!src/types/**',
    '!src/utils/asyncContext.ts',
    '!src/providers/interface/IOtpProvider.ts',
  ],
};