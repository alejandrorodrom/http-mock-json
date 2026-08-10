import { logError, logMessage } from "../../../scripts/log.script";
import { prompt } from "prompts";
import fs from "fs";
import { join } from "path";
import { printDuration } from "../../../scripts/duration.script";
import { bold, dim, green } from "colorette";
import { terminalPrompt } from "../../../scripts/unix.script";
import { AddOptions } from "../../../types/options.type";
import { HttpVerbs } from "../../../constants/http-verbs.constant";
import { structureMock } from "./structure-mock";
import { structureCrudFullMock, structureCrudMock } from "./structure-crud-mock";
import { structureScenariosMock } from "./structure-scenarios-mock";
import { structureAuthLoginMock } from "./structure-auth-login-mock";
import { structureProxyHybridMock } from "./structure-proxy-hybrid-mock";
import { structurePaginatedListMock } from "./structure-paginated-list-mock";
import { structureUploadMock } from "./structure-upload-mock";
import {
  DEFAULT_RELATIONS_CHILD_SEGMENT,
  normalizeRelationsChildSegment,
  relationsChildCollides,
  structureRelationsMock
} from "./structure-relations-mock";
import {
  AddPreset,
  presetInitialEndpoint,
  presetLabel,
  presetNeedsHttpVerbs,
  presetReadyHint,
  resolveAddPreset
} from "./presets";
import { PromptAddMock } from "../../../interfaces/mock.interface";
import { resolveMocksDir } from "../../../scripts/mocks-path.script";

const buildPresetPayload = (
  preset: AddPreset,
  endpoint: string,
  httpVerbs: HttpVerbs[],
  relationsChild?: string
): Record<string, unknown> => {
  switch (preset) {
    case 'static':
      return structureMock(endpoint, httpVerbs);
    case 'crud':
      return structureCrudMock(endpoint);
    case 'crud-full':
      return structureCrudFullMock(endpoint);
    case 'scenarios':
      return structureScenariosMock(endpoint);
    case 'auth-login':
      return structureAuthLoginMock(endpoint);
    case 'proxy-hybrid':
      return structureProxyHybridMock(endpoint);
    case 'paginated-list':
      return structurePaginatedListMock(endpoint);
    case 'upload':
      return structureUploadMock(endpoint);
    case 'relations':
      return structureRelationsMock(
        endpoint,
        relationsChild ?? DEFAULT_RELATIONS_CHILD_SEGMENT
      );
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
};

/** Default child, or prompt when it collides. `null` = user aborted. */
const resolveRelationsChildSegment = async (
  parentEndpoint: string
): Promise<string | null> => {
  if (!relationsChildCollides(parentEndpoint, DEFAULT_RELATIONS_CHILD_SEGMENT)) {
    return DEFAULT_RELATIONS_CHILD_SEGMENT;
  }

  const { childSegment } = await prompt({
    type: 'text',
    name: 'childSegment',
    message: `Parent collides with default child "${ DEFAULT_RELATIONS_CHILD_SEGMENT }". Child collection name?`,
    initial: 'comments',
    validate: (value: string) => {
      try {
        const normalized = normalizeRelationsChildSegment(value);
        if (relationsChildCollides(parentEndpoint, normalized)) {
          return `Child "${ normalized }" still collides with parent — pick another name`;
        }
        return true;
      } catch (error) {
        return error instanceof Error ? error.message : 'Invalid child collection name';
      }
    }
  });

  if (childSegment === undefined || childSegment === null) {
    return null;
  }

  return normalizeRelationsChildSegment(String(childSegment));
};

export const addMock = async (options: AddOptions) => {
  try {
    const preset = resolveAddPreset(options);
    const mocks = resolveMocksDir(options.path);

    logMessage(`Preparing mock (${ presetLabel(preset) })`, true);
    const { name, endpoint, httpVerbs }: PromptAddMock = await prompt([
      {
        type: 'text',
        name: 'name',
        validate: (name: string) => !/[^A-Za-z0-9-/:]+/.test(name) && name.length > 0,
        message: 'What is the name of the json file ?'
      },
      {
        type: 'text',
        name: 'endpoint',
        validate: (name: string) => !/[^A-Za-z0-9-/:]+/.test(name) && name.length > 0,
        message: 'What is the endpoint ?',
        initial: presetInitialEndpoint(preset)
      },
      {
        type: () => presetNeedsHttpVerbs(preset) ? 'multiselect' : null,
        name: 'httpVerbs',
        message: 'Select the http verbs you use',
        instructions: `\nInstructions:\n    ↑/↓: Highlight option\n    ←/→/[space]: Toggle selection\n    a: Toggle all\n    enter/return: Complete answer\n`,
        min: 1,
        choices: [
          { title: 'GET', value: HttpVerbs.get },
          { title: 'POST', value: HttpVerbs.post },
          { title: 'PUT', value: HttpVerbs.put },
          { title: 'PATCH', value: HttpVerbs.patch },
          { title: 'DELETE', value: HttpVerbs.delete }
        ],
      }
    ]);

    if (!name || !endpoint) {
      console.log(`\n${ dim('☹️ Aborting...') }`);
      return;
    }

    let relationsChild: string | undefined;
    if (preset === 'relations') {
      const child = await resolveRelationsChildSegment(endpoint);
      if (child === null) {
        console.log(`\n${ dim('☹️ Aborting...') }`);
        return;
      }
      relationsChild = child;
    }

    const { confirm }: PromptAddMock = await prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'Confirm?',
      initial: true,
    });

    if (!confirm) {
      console.log(`\n${ dim('☹️ Aborting...') }`);
      return;
    }

    const mockFile = join(mocks, `${ name }.json`);

    if (fs.existsSync(mockFile)) {
      const { overwrite } = await prompt({
        type: 'confirm',
        name: 'overwrite',
        message: `File "${ name }.json" already exists. Overwrite?`,
        initial: false,
      });

      if (!overwrite) {
        console.log(`\n${ dim('☹️ Aborting...') }`);
        return;
      }
    }

    const startTime = Date.now();
    const payload = buildPresetPayload(
      preset,
      endpoint,
      httpVerbs ?? [],
      relationsChild
    );

    fs.writeFileSync(
      mockFile,
      JSON.stringify(payload, null, 2),
      { encoding: 'utf8' }
    );

    const time = printDuration(Date.now() - startTime);

    console.log(`${ green(`✔ ${ bold('Mock ready 🎉') }`) } ${ dim(time) }`);
    console.log(`${ dim(presetReadyHint(preset)) }`);

    console.log(`\n${ dim('You may find the following commands will be helpful:') }\n`);
    console.log(`\t${ dim(terminalPrompt()) } ${ green('mock-server start') }`);
    console.log(`\tStart mock server.\n`);
    console.log(`\t${ dim(terminalPrompt()) } ${ green('mock-server add') }`);
    console.log(`\tAdd new endpoint to mock server.\n`);
    console.log('Happy coding! 🎈');
  } catch (e) {
    logError(e);
    process.exitCode = 1;
  }
}
