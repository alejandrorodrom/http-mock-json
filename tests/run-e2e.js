#!/usr/bin/env node
'use strict';

/**
 * E2E test runner (CLI / server scenarios end-to-end).
 *
 * 1) Preflight: error-catalog mappings (test inventory guard)
 * 2) Cases: each mock/CLI/runtime scenario in isolation
 *
 * Unit tests can live later under tests/unit/ with their own runner.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const { useCases } = require('./e2e/cases');
const {
  assertErrorCatalog,
  printCatalogPreflight
} = require('./e2e/lib/assert-error-catalog');
const { printHeader, printCaseResult, printSummary } = require('./e2e/lib/reporter');
const { PROJECT_ROOT } = require('./e2e/lib/execute-mock-file');

function ensureBuild() {
  // Always rebuild so src/ changes (error messages, validators, etc.) are what the suite runs.
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

function parseFilter() {
  const args = process.argv.slice(2);
  const filterIndex = args.findIndex((arg) => arg === '--filter' || arg === '-f');

  if (filterIndex >= 0 && args[filterIndex + 1]) {
    return args[filterIndex + 1].toLowerCase();
  }

  const onlyFlag = args.find((arg) => arg.startsWith('--only='));
  if (onlyFlag) {
    return onlyFlag.slice('--only='.length).toLowerCase();
  }

  return null;
}

async function main() {
  ensureBuild();

  printHeader();

  const catalogCheck = assertErrorCatalog(useCases.map((useCase) => useCase.name));
  printCatalogPreflight(catalogCheck);

  if (!catalogCheck.ok) {
    console.error('Aborting: fix error-catalog.js mappings before running e2e tests.');
    process.exit(1);
  }

  const filter = parseFilter();
  const selected = filter
    ? useCases.filter((useCase) => useCase.name.toLowerCase().includes(filter))
    : useCases;

  if (selected.length === 0) {
    console.error(`No e2e cases matched filter: ${ filter }`);
    process.exit(1);
  }

  if (filter) {
    console.log(`Filter: ${ filter } (${ selected.length } case(s))\n`);
  }

  const startedAt = Date.now();
  /** @type {import('./e2e/lib/reporter').CaseResult[]} */
  const results = [];

  for (const useCase of selected) {
    const result = await useCase.run();
    results.push(result);
    printCaseResult(result);
  }

  printSummary(results, Date.now() - startedAt);

  const failed = results.some((result) => !result.passed);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
