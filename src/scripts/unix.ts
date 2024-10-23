export function onlyWin(str: string) {
  return isWin() ? str : '';
}

export function isWin() {
  return process.platform === 'win32';
}

export function terminalPrompt() {
  return isWin() ? '>' : '$';
}
