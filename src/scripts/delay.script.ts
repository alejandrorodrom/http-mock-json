export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const resolveDelay = (
  responseDelay: number | undefined,
  methodDelay: number | undefined
): number => {
  return responseDelay ?? methodDelay ?? 0;
};
