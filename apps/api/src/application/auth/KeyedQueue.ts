const ignoreOutcome = (): void => undefined;

/** Runs the tasks of one key one after another, in the order they arrived. Other keys do not wait. */
export class KeyedQueue {
  private readonly tails = new Map<string, Promise<void>>();

  run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const result = (this.tails.get(key) ?? Promise.resolve()).then(task);
    // The next task waits for this one to end, whatever its outcome.
    const tail = result.then(ignoreOutcome, ignoreOutcome);
    this.tails.set(key, tail);
    void tail.then(() => {
      if (this.tails.get(key) === tail) this.tails.delete(key);
    });
    return result;
  }
}
