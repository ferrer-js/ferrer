/**
 * Combine a list of iterables into a single iterable that will sequentially
 * exhaust each iterator of each iterable.
 */
export function* concatIterables<T>(
  ...iterables: Iterable<T>[]
): Generator<T, void, undefined> {
  for (const it of iterables) yield* it
}

/**
 * Construct a ONE-OFF `Iterable<T>` from an `Iterator<T>`, which will
 * return the provided iterator, ONCE, when an iterator is requested.
 *
 * Requesting the iterator multiple times will throw an error.
 */
export function iteratorToIterable<T>(iterator: Iterator<T>): Iterable<T> {
  if (Symbol.iterator in iterator) {
    return iterator as Iterable<T>
  }

  let _iterator: Iterator<T> | undefined = iterator
  return {
    [Symbol.iterator]() {
      if (!_iterator) {
        throw new Error(
          "iteratorToIterable(): unexpected double call to [Symbol.iterator] - this iterable can only be used once."
        )
      }
      const result = _iterator
      _iterator = undefined
      return result
    }
  }
}
