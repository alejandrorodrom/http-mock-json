'use strict';

/**
 * Removes ANSI escape codes (colorette / terminal colors) from a string.
 * @param {string} value
 * @returns {string}
 */
function stripAnsi(value) {
  return String(value).replace(/\u001b\[[0-9;]*m/g, '');
}

/**
 * Extracts comparable message candidates from a console line.
 * @param {string} line
 * @returns {string[]}
 */
function extractCandidatesFromLine(line) {
  const trimmed = line.trim();

  if (!trimmed) {
    return [];
  }

  /** @type {string[]} */
  const candidates = [trimmed];

  if (trimmed.startsWith('✖ ')) {
    const body = trimmed.slice(2);
    candidates.push(body);

    if (body.startsWith('Error: ')) {
      candidates.push(body.slice('Error: '.length));
    }
  }

  const withMethod = trimmed.match(/^\[[A-Za-z]+\]\s+(.+?):\s+(.*)$/);

  if (withMethod) {
    candidates.push(withMethod[2]);
  } else if (!trimmed.startsWith('File:')) {
    const withEndpoint = trimmed.match(/^(\S+):\s+(.*)$/);

    if (withEndpoint) {
      candidates.push(withEndpoint[2]);
    }
  }

  return [...new Set(candidates)];
}

/**
 * @param {string} output
 * @returns {string[]}
 */
function extractConsoleMessages(output) {
  const messages = [];

  for (const line of String(output).split(/\r?\n/)) {
    messages.push(...extractCandidatesFromLine(line));
  }

  return [...new Set(messages.filter(Boolean))];
}

/**
 * Exact coincidence against console output.
 * @param {string} output
 * @param {string} expected
 * @returns {boolean}
 */
function hasExactConsoleMatch(output, expected) {
  if (!expected) {
    return true;
  }

  return extractConsoleMessages(output).includes(expected);
}

/**
 * Finds the closest actual message for a failed expectation (simple edit distance).
 * @param {string} expected
 * @param {string[]} actualMessages
 * @returns {string | null}
 */
function findClosestMessage(expected, actualMessages) {
  if (actualMessages.length === 0) {
    return null;
  }

  let best = null;
  let bestScore = Infinity;

  for (const actual of actualMessages) {
    // Prefer messages that share a long common prefix / contain similar tokens
    const score = levenshtein(expected, actual);

    if (score < bestScore) {
      bestScore = score;
      best = actual;
    }
  }

  // Ignore totally unrelated matches
  if (best === null || bestScore > Math.max(expected.length, best.length)) {
    return null;
  }

  // If distance is huge relative to length, skip
  if (bestScore > Math.max(12, Math.floor(expected.length * 0.5))) {
    // Still return if one contains the other almost (typo at end)
    if (
      best.startsWith(expected.slice(0, Math.min(20, expected.length))) ||
      expected.startsWith(best.slice(0, Math.min(20, best.length)))
    ) {
      return best;
    }

    return null;
  }

  return best;
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function levenshtein(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  /** @type {number[]} */
  let prev = Array.from({ length: cols }, (_, i) => i);
  /** @type {number[]} */
  let curr = new Array(cols);

  for (let i = 1; i < rows; i += 1) {
    curr[0] = i;

    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }

    [prev, curr] = [curr, prev];
  }

  return prev[b.length];
}

/**
 * Builds a detailed failure description for a missing exact match.
 * @param {string} label
 * @param {string} expected
 * @param {string} output
 * @returns {string}
 */
function formatMissingMatchFailure(label, expected, output) {
  const actualMessages = extractConsoleMessages(output);
  const closest = findClosestMessage(expected, actualMessages);
  const lines = [
    `${ label }`,
    `    expected: ${ JSON.stringify(expected) }`
  ];

  if (closest) {
    lines.push(`    actual:   ${ JSON.stringify(closest) }`);
  } else {
    lines.push('    actual:   <no similar message found in console>');
  }

  const consolePreview = String(output)
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .slice(0, 20);

  if (consolePreview.length > 0) {
    lines.push('    console:');
    for (const line of consolePreview) {
      lines.push(`      ${ line }`);
    }
  }

  return lines.join('\n');
}

module.exports = {
  stripAnsi,
  hasExactConsoleMatch,
  extractConsoleMessages,
  findClosestMessage,
  formatMissingMatchFailure
};
