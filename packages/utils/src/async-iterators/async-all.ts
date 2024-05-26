// Utility types for asyncAll
type ExtractAsyncIterableType<T> = T extends AsyncIterable<infer R> ? R : never
type Extract<Tuple extends AsyncIterable<unknown>[]> = {
  [index in keyof Tuple]: ExtractAsyncIterableType<Tuple[index]> | undefined
}

/**
 * By analogy with `Promise.all`, create an async iterable that combines an
 * array of other async iterables,
 * yielding a result of the form `[...undefined, value, ...undefined]` each
 * time any of the combined iterables yields. The position of `value` in the
 * yielded array corresponds to whichever iterable yielded the value.
 *
 * If any of the iterables throws, the combined iterable will rethrow the
 * thrown error and terminate.
 *
 * If any of the iterables returns, the combined iterator will no longer
 * yield values for that iterable. Once all iterables have returned, the
 * combined iterable will return with the array of return values for
 * each iterable.
 *
 * When the combined iterable terminates, `return` will be called on all
 * input iterables that have not yet terminated.
 */
export async function* asyncAll<T extends AsyncIterable<unknown>[]>(
  ...iterables: T
): AsyncGenerator<Extract<T>> {
  const asyncIterators = Array.from(iterables, (o) => o[Symbol.asyncIterator]())
  const results: unknown[] = []
  const baseCount = asyncIterators.length
  let count = asyncIterators.length
  const never = new Promise(() => {})
  function getNext<U>(asyncIterator: AsyncIterator<U>, index: number) {
    return asyncIterator.next().then((result) => ({
      index,
      result
    }))
  }
  const nextPromises = asyncIterators.map(getNext)
  try {
    while (count) {
      const { index, result } = await Promise.race(nextPromises)
      if (result.done ?? false) {
        // `never` is a sentinel value that will never be used, so this is safe
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        nextPromises[index] = never
        results[index] = result.value
        count--
      } else {
        nextPromises[index] = getNext(asyncIterators[index], index)
        const yielded: unknown[] = Array.from(
          { length: baseCount },
          () => undefined
        )
        yielded[index] = result.value
        yield yielded as Extract<T>
      }
    }
  } finally {
    for (const [index, iterator] of asyncIterators.entries())
      if (nextPromises[index] !== never && iterator.return != null)
        void iterator.return()
    // no await here - see https://github.com/tc39/proposal-async-iteration/issues/126
  }
  return results
}
