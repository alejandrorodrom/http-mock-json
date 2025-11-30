import { connect, Socket } from 'node:net';

const CONNECTION_TIMEOUT = 1000;

export const checkPortAvailable = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    let resolved = false;
    const socket: Socket = connect({ port, host: '127.0.0.1' });

    const cleanup = () => {
      if (!socket.destroyed) {
        socket.destroy();
      }
    };

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(true);
      }
    }, CONNECTION_TIMEOUT);

    socket.once('connect', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        cleanup();
        resolve(false);
      }
    });

    socket.once('error', (error: NodeJS.ErrnoException) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);

        if (error.code === 'ECONNREFUSED') {
          resolve(true);
          return;
        }

        resolve(false);
      }
    });
  });
};

export const validatePortAvailable = async (port: number): Promise<void> => {
  const isAvailable = await checkPortAvailable(port);

  if (!isAvailable) {
    throw new Error(`Port ${port} is already in use. Please use a different port.`);
  }
};

