#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const {
  useCases,
  classicCases,
  externalCases
} = require('./e2e/cases');
const {
  assertErrorCatalog,
  printCatalogPreflight
} = require('./e2e/lib/assert-error-catalog');
const { printHeader, printCaseResult, printSummary } = require('./e2e/lib/reporter');
const { PROJECT_ROOT } = require('./e2e/lib/execute-mock-file');

function ensureBuild() {
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.status !== 0) {
    console.error('Build failed. Aborting e2e suite.');
    process.exit(1);
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let filter = null;
  let suite = 'classic';

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--filter' || arg === '-f') {
      filter = (args[index + 1] || '').toLowerCase() || null;
      index += 1;
      continue;
    }

    if (arg.startsWith('--only=')) {
      filter = arg.slice('--only='.length).toLowerCase();
      continue;
    }

    if (arg === '--suite') {
      suite = (args[index + 1] || '').toLowerCase() || 'classic';
      index += 1;
      continue;
    }

    if (arg.startsWith('--suite=')) {
      suite = arg.slice('--suite='.length).toLowerCase();
    }
  }

  if (!['classic', 'external', 'all'].includes(suite)) {
    console.error(`Unknown suite "${ suite }". Use classic | external | all.`);
    process.exit(1);
  }

  return { filter, suite };
}

function casesForSuite(suite) {
  if (suite === 'external') {
    return externalCases;
  }

  if (suite === 'all') {
    return useCases;
  }

  return classicCases;
}

async function main() {
  ensureBuild();

  const { filter, suite } = parseArgs();

  printHeader(suite);

  const catalogCheck = assertErrorCatalog(useCases.map((useCase) => useCase.name));
  printCatalogPreflight(catalogCheck);

  if (!catalogCheck.ok) {
    console.error('Aborting: fix error-catalog.js mappings before running e2e tests.');
    process.exit(1);
  }

  const pool = casesForSuite(suite);
  const selected = filter
    ? pool.filter((useCase) => useCase.name.toLowerCase().includes(filter))
    : pool;

  if (selected.length === 0) {
    if (filter) {
      const elsewhere = useCases.filter((useCase) => (
        useCase.name.toLowerCase().includes(filter) && !pool.includes(useCase)
      ));
      if (elsewhere.length > 0) {
        console.error(
          `Filter "${ filter }" matched ${ elsewhere.length } case(s) outside suite "${ suite }". `
          + 'Use --suite external or --suite all.'
        );
      } else {
        console.error(`No e2e cases matched filter: ${ filter }`);
      }
    } else {
      console.error(`No e2e cases in suite: ${ suite }`);
    }
    process.exit(1);
  }

  if (filter) {
    console.log(`Filter: ${ filter } (${ selected.length } case(s))\n`);
  } else {
    console.log(`Suite: ${ suite } (${ selected.length } case(s))\n`);
  }

  if (suite === 'external') {
    console.log(
      `Note: external suite (${ selected.length } case(s)) depends on third-party APIs `
      + '(may fail when upstream is down).\n'
    );
  }

  const startedAt = Date.now();
  /** @type {import('./e2e/lib/reporter').CaseResult[]} */
  const results = [];

  for (const useCase of selected) {
    const result = await useCase.run();
    results.push(result);
    printCaseResult(result);
  }

  const failed = results.some((result) => !result.passed);
  const informational = suite === 'external';

  printSummary(results, Date.now() - startedAt, { informational });

  if (informational) {
    process.exit(0);
  }

  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
