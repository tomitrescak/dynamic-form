module.exports = function(wallaby) {
  return {
    files: [
      'package.json',
      'tsconfig.json',
      'src/**/*.+(js|jsx|ts|tsx|json|snap|css|less|sass|scss|jpg|jpeg|gif|png|svg|graphql)',
      '!src/**/*.test.+(ts|tsx)'
    ],
    filesWithNoCoverageCalculated: [],
    tests: [
      //'src/client/modules/form/**/checkbox_view.test.+(ts|tsx)',
      'src/**/*.test.+(ts|tsx)'
    ],

    env: {
      type: 'node',
      runner: 'node'
    },
    workers: {
      initial: 1,
      regular: 1
    },
    testFramework: 'jest'
  };
};
