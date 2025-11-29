export const iterateEntries = <T extends Record<string, unknown>>(
  object: T
): Array<[string, T[keyof T]]> => {
  return Object.entries(object) as Array<[string, T[keyof T]]>;
};

export const getKeys = <T extends Record<string, unknown>>(object: T): string[] => {
  return Object.keys(object);
};

export const getAllValues = <T>(record: Record<string, T[]>): T[] => {
  return Object.values(record).flat();
};
