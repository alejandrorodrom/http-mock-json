'use strict';

const { green, red, cyan, dim, bold, yellow } = require('colorette');

/**
 * @typedef {object} CaseResult
 * @property {string} name
 * @property {string} description
 * @property {boolean} passed
 * @property {string[]} failures
 * @property {number} durationMs
 * @property {'success' | 'error'} expectedOutcome
 */

function printHeader() {
  console.log('');
  console.log(bold(cyan('http-mock-json · e2e suite')));
  console.log(dim('CLI/server scenarios end-to-end (start + console/HTTP assertions)'));
  console.log('');
}

/**
 * @param {CaseResult} result
 */
function printCaseResult(result) {
  const icon = result.passed ? green('✔') : red('✖');
  const title = `${ result.name }`;
  const meta = dim(`(${ result.expectedOutcome }, ${ result.durationMs }ms)`);

  console.log(`${ icon } ${ title } ${ meta }`);
  console.log(`  ${ dim(result.description) }`);

  if (!result.passed) {
    for (const failure of result.failures) {
      const [firstLine, ...rest] = String(failure).split('\n');
      console.log(`  ${ red('›') } ${ firstLine }`);

      for (const line of rest) {
        console.log(`    ${ dim(line) }`);
      }
    }
  }
}

/**
 * @param {CaseResult[]} results
 * @param {number} totalMs
 */
function printSummary(results, totalMs) {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  console.log('');
  console.log(dim('─'.repeat(56)));

  if (failed === 0) {
    console.log(green(bold(`Tests: ${ passed } passed, ${ failed } failed (${ results.length } total)`)));
  } else {
    console.log(red(bold(`Tests: ${ passed } passed, ${ failed } failed (${ results.length } total)`)));
  }

  console.log(dim(`Time:  ${(totalMs / 1000).toFixed(2)}s`));
  console.log('');

  if (failed > 0) {
    console.log(yellow('Failed cases:'));
    for (const result of results.filter((r) => !r.passed)) {
      console.log(`  ${ red('✖') } ${ result.name }`);
    }
    console.log('');
  }
}

module.exports = {
  printHeader,
  printCaseResult,
  printSummary
};
