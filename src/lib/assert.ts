export function invariant(condition: any, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function unreachable(message = "Unreachable code executed"): never {
  throw new Error(message);
}
