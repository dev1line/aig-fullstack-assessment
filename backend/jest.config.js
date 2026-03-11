module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  transformIgnorePatterns: ['node_modules/(?!(.pnpm|natural|afinn-165|afinn-165-financevocab|stopwords-iso|uuid)/)'],
  collectCoverageFrom: ['**/*.(t|j)s', '!**/main.ts', '!**/*.module.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
