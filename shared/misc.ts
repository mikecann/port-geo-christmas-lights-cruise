export function pick<T, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
  const ret: Partial<Pick<T, K>> = {};
  keys.forEach((key) => {
    ret[key] = obj[key];
  });
  return ret as Pick<T, K>;
}

export function exhaustiveCheck(param: never): never {
  throw new Error(`Exhaustive check failed: ${param}`);
}

export function wait(ms: number) {
  return new Promise((resolve, _reject) => setTimeout(resolve, ms));
}

export const iife = <T>(fn: () => T): T => fn();
