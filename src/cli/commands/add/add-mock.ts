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
import { PromptAddMock } from "../../../interfaces/mock.interface";

export const addMock = async (
  { path }: AddOptions
) => {
  try {
    const mocks = join(process.cwd(), path, 'mocks');

    logMessage('Preparing mock', true)
    const { name, endpoint, httpVerbs, confirm }: PromptAddMock = await prompt([
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
        message: 'What is the endpoint ?'
      },
      {
        type: 'multiselect',
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
      },
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Confirm?',
        initial: true,
      }
    ]);

    if (confirm) {
      const startTime = Date.now();

      fs.writeFileSync(
        join(mocks, `${ name }.json`),
        JSON.stringify(structureMock(endpoint, httpVerbs), null, 2),
        { encoding: 'utf8' }
      );

      const time = printDuration(Date.now() - startTime);

      console.log(`${ green(`✔ ${ bold('Mock ready 🎉') }`) } ${ dim(time) }`);
      console.log(`${dim(`! Add a response to the created mock`)}`)

      console.log(`\n${ dim('You may find the following commands will be helpful:') }\n`);
      console.log(`\t${ dim(terminalPrompt()) } ${ green('mock-server start') }`);
      console.log(`\tStart mock server.\n`);
      console.log(`\t${ dim(terminalPrompt()) } ${ green('mock-server add') }`);
      console.log(`\tAdd new endpoint to mock server.\n`);
      console.log('Happy coding! 🎈');
    } else {
      console.log(`\n${ dim('☹️ Aborting...') }`);
    }
  } catch (e) {
    logError(e)
  }
}
