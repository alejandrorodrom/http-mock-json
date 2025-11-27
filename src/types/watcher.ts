export type Watcher = {
  close: () => Promise<void>;
  on: (event: 'add' | 'change' | 'unlink', listener: () => void) => Watcher;
};

