import { clear } from '../scripts/clear.script';
import { blue } from 'colorette';
import figlet from 'figlet';
import { interactive } from './interactive';

export const run = () => {
  const args = process.argv.slice(2);

  if (!args.length || args.indexOf('--help') >= 0 || args.indexOf('-h') >= 0) {
    clear();
    console.log(
      blue(
        figlet.textSync('MOCK SERVER', {horizontalLayout: 'full'})
      )
    );
  }

  interactive();
}
