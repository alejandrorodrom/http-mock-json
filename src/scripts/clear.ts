import { cursor, erase } from 'sisteransi';

export const clear = () => {
  process.stdout.write(erase.screen);
  process.stdout.write(cursor.to(0, 1));
}
