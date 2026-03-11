module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.e2e-spec.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  transformIgnorePatterns: ['node_modules/(?!(.pnpm|natural|afinn-165|afinn-165-financevocab|stopwords-iso|uuid)/)'],
  testEnvironment: 'node',
};
