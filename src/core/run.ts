import { clear } from '../scripts/clear';
import { blue } from 'colorette';
import figlet from 'figlet';
import { command } from './command';

export const run = () => {
  const args = process.argv.slice(2);

  if (!args.length || args.indexOf('--help')>=0 || args.indexOf('-h') >= 0) {
    clear();
    console.log(
      blue(
        figlet.textSync('MOCK SERVER', { horizontalLayout: 'full' })
      )
    );
  }

  command();
}
