import { bold, dim, green } from 'colorette';
import { DEFAULT_MOCK_PORT } from '../../../constants/mock-config.constant';
import { terminalPrompt } from '../../../scripts/unix.script';
import { normalizeEndpoint } from './normalize-endpoint';
import { AddPreset, presetReadyHint } from './presets';

export const formatAddNextStepsLines = (
  endpoint: string,
  preset: AddPreset
): string[] => {
  const route = normalizeEndpoint(endpoint);
  return [
    'Next:',
    'mock-server start',
    `curl -i http://localhost:${ DEFAULT_MOCK_PORT }/${ route }`,
    presetReadyHint(preset)
  ];
};

export const formatInitNextStepsLines = (): string[] => {
  return [
    'Next:',
    'mock-server add',
    'mock-server start'
  ];
};

export const formatImportNextStepsLines = (): string[] => {
  return [
    'Next:',
    'mock-server start'
  ];
};

/** Tips start with `!`; everything else after the header is a CLI command. */
export const printNextSteps = (lines: string[]): void => {
  if (lines.length === 0) {
    return;
  }

  console.log(`\n${ bold(lines[0]) }`);

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith('!')) {
      console.log(`${ dim(line) }`);
    } else {
      console.log(`\t${ dim(terminalPrompt()) } ${ green(line) }`);
    }
  }
};

export const printAddNextSteps = (
  endpoint: string,
  preset: AddPreset
): void => {
  printNextSteps(formatAddNextStepsLines(endpoint, preset));
};

export const printInitNextSteps = (): void => {
  printNextSteps(formatInitNextStepsLines());
};

export const printImportNextSteps = (): void => {
  printNextSteps(formatImportNextStepsLines());
};
