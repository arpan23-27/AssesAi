// Runs ESLint (with the correct per-package flat config) and Prettier on
// staged files only. Each package's eslint is invoked from inside that package
// so its own eslint.config.js is picked up.
const path = require('path');

const relativeTo = (dir, files) =>
  files.map((f) => path.relative(dir, f)).join(' ');

module.exports = {
  'backend/**/*.js': (files) => [
    `bash -c "cd backend && npx eslint --fix ${relativeTo('backend', files)}"`,
    `prettier --write ${files.join(' ')}`,
  ],
  'frontend/**/*.{js,jsx}': (files) => [
    `bash -c "cd frontend && npx eslint --fix ${relativeTo('frontend', files)}"`,
    `prettier --write ${files.join(' ')}`,
  ],
  '**/*.{json,md}': (files) => [`prettier --write ${files.join(' ')}`],
};
