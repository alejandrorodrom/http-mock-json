'use strict';

const { stripAnsi } = require('./strip-ansi');

/**
 * @param {() => void | Promise<void>} fn
 * @returns {Promise<string>}
 */
async function captureLogs(fn) {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => {
    logs.push(stripAnsi(args.map(String).join(' ')));
  };

  try {
    await fn();
  } finally {
    console.log = originalLog;
  }

  return logs.join('\n');
}

module.exports = { captureLogs };
