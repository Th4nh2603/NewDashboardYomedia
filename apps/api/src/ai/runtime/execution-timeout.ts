export function withExecutionTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      setTimeout(() => reject(new Error("Agent execution timed out.")), timeoutMs);
    }),
  ]);
}
