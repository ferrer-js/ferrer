import { deferred, type Deferred } from "../promises.js"

/**
 * An `AsyncIterableIterator` to which values can be pushed via `.pushValue`.
 */
export class PushableAsyncIterator<T> implements AsyncIterableIterator<T> {
  /**
   * Internal: is the iterator running?
   */
  _running: boolean = true

  /**
   * Internal: what Error, if any, has been thrown from the producer end of
   * the iterator
   */
  _thrown?: unknown = undefined

  /**
   * Internal: what value, if any, has been returned from the iterator
   */
  _returned?: T = undefined

  /**
   * Internal: A sequence of `Deferred`s for waiting consumers
   */
  _pullQueue: Deferred<IteratorResult<T>>[] = []

  /**
   * Internal: Objects produced but not yet consumed.
   */
  _pushQueue: IteratorResult<T>[] = []

  /**
   * Push a value to the iterator, such that the longest outstanding promise
   * returned from `next()` will be fulfilled with the given value.
   *
   * Returns `true` if the value is successfully pushed, or `false` if the
   * iterator is stopped due to `throw()` or `return()` having been called.
   */
  pushValue(value: T): boolean {
    if (!this._running) {
      return false
    }
    if (this._pullQueue.length > 0) {
      const r = this._pullQueue.shift() as Deferred<IteratorResult<T>>
      // Resolve the oldest waiting promise if there is one
      r.resolve({
        value: value,
        done: false
      })
    } else {
      // Otherwise push into un-consumed queue
      this._pushQueue.push({ value, done: false })
    }
    return true
  }

  _pullValue(): Promise<IteratorResult<T>> {
    const def = deferred<IteratorResult<T>>()
    if (this._pushQueue.length > 0) {
      def.resolve(this._pushQueue.shift() as IteratorResult<T>)
    } else {
      this._pullQueue.push(def)
    }
    return def.promise
  }

  _terminalValue(): Promise<IteratorResult<T>> {
    if (this._pushQueue.length > 0) {
      return Promise.resolve(this._pushQueue.shift() as IteratorResult<T>)
    } else if (this._thrown !== undefined) {
      const exn = this._thrown
      this._thrown = undefined
      return Promise.reject(exn)
    } else {
      const returned = this._returned
      this._returned = undefined
      return Promise.resolve({ value: returned, done: true })
    }
  }

  _end() {
    this._running = false
    const firstDef = this._pullQueue.shift()
    if (firstDef) {
      if (this._thrown !== undefined) {
        const exn = this._thrown
        this._thrown = undefined
        firstDef.reject(exn)
      } else {
        const returned = this._returned
        this._returned = undefined
        firstDef.resolve({ value: returned, done: true })
      }
    }
    this._pullQueue.forEach((def) => {
      if (this._thrown !== undefined) def.reject(this._thrown)
      else def.resolve({ value: undefined, done: true })
    })
    this._pullQueue.length = 0
  }

  [Symbol.asyncIterator]() {
    return this
  }

  /**
   * Get the next value from the async iterator.
   */
  next(): Promise<IteratorResult<T>> {
    if (this._running) {
      return this._pullValue()
    } else {
      return this._terminalValue()
    }
  }

  /**
   * Terminate the iterator, with the given result as its
   * last value.
   */
  return(result?: T): Promise<IteratorResult<T>> {
    if (this._running) {
      this._returned = result
      this._end()
    }
    return Promise.resolve({ value: result, done: true })
  }

  /**
   * Throw an error from within the iterator; the next consumer will receive
   * a rejected promise.
   */
  throw(error?: unknown): Promise<IteratorResult<T>> {
    if (this._running) {
      this._thrown = error
      this._end()
    }
    return Promise.reject(error)
  }
}
