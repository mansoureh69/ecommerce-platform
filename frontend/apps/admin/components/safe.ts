/** Awaits a mutation whose error is already shown from the mutation state; avoids an unhandled rejection. */
export async function settled<T>(promise: Promise<T>): Promise<T | undefined> {
  try {
    return await promise;
  } catch {
    return undefined;
  }
}
