/** Possible states of a Promise. */
export enum PromiseState {
  REJECTED = "rejected",
  FULFILLED = "fulfilled",
  PENDING = "pending"
}

/** Reflection of a pending Promise. */
export interface ReflectedPending {
  state: PromiseState.PENDING
  isFulfilled: false
  isRejected: false
}

/** Reflection of a fulfilled Promise. */
export interface ReflectedFulfilled<ValueT> {
  state: PromiseState.FULFILLED
  value: ValueT
  isFulfilled: true
  isRejected: false
}

/** Reflection of a rejected Promise. */
export interface ReflectedRejected {
  state: PromiseState.REJECTED
  reason: unknown
  isFulfilled: false
  isRejected: true
}

export interface DeferredData<ValueT> {
  /** The deferred promise */
  promise: Promise<ValueT>
  /** Fulfill the deferred promise with the given value */
  resolve(value: ValueT): void
  /** Reject the deferred promise with the given error. */
  reject(reason?: unknown): void
}

export type DeferredPending<ValueT> = ReflectedPending & DeferredData<ValueT>
export type DeferredFulfilled<ValueT> = ReflectedFulfilled<ValueT> &
  DeferredData<ValueT>
export type DeferredRejected<ValueT> = ReflectedRejected & DeferredData<ValueT>

/**
 * Type of a deferred object, which combines a pending promise with methods
 * to trigger settlement of that promise, along with reflection information
 * about that promise's state.
 */
export type Deferred<ValueT> =
  | DeferredPending<ValueT>
  | DeferredFulfilled<ValueT>
  | DeferredRejected<ValueT>

/**
 * Create a deferred promise in the `pending` state which can later be resolved
 * by calling either the `resolve` or `reject` methods on the returned deferred
 * object.
 */
export function deferred<ValueT>(): Deferred<ValueT> {
  const def = {} as Deferred<ValueT>

  def.state = PromiseState.PENDING

  def.promise = new Promise<ValueT>((resolve, reject) => {
    def.resolve = (value) => {
      if (def.state === PromiseState.PENDING) {
        const resolvedDef = def as unknown as DeferredFulfilled<ValueT>
        resolvedDef.state = PromiseState.FULFILLED
        resolvedDef.value = value
        resolve(value)
      }
    }

    def.reject = (reason) => {
      if (def.state === PromiseState.PENDING) {
        const rejectedDef = def as unknown as DeferredRejected<ValueT>
        rejectedDef.state = PromiseState.REJECTED
        rejectedDef.reason = reason
        reject(reason)
      }
    }
  })

  return def
}

/** Test if a value is a native Promise. */
export function isPromise(p: unknown): p is Promise<unknown> {
  return p instanceof Promise
}

/** Test if a value is "promise-like" or "thenable" */
export function isPromiseLike(p: unknown): p is PromiseLike<unknown> {
  if (isPromise(p)) return true
  if (typeof p === "object" && !!p && "then" in p) {
    return p.then instanceof Function
  } else {
    return false
  }
}

/** Type representing the value of a reflected Promise. */
export type Reflected<ValueT> = ReflectedFulfilled<ValueT> | ReflectedRejected

/**
 * Reflect a Promise, creating a new promise that is always eventually
 * fulfilled, yielding a structure containing status information about whether
 * the original Promise fulfilled or rejected.
 */
export async function reflect<ValueT>(
  promise: PromiseLike<ValueT>
): Promise<Reflected<ValueT>> {
  try {
    const value = await promise
    return {
      state: PromiseState.FULFILLED,
      value,
      isFulfilled: true,
      isRejected: false
    }
  } catch (err) {
    return {
      state: PromiseState.REJECTED,
      reason: err,
      isFulfilled: false,
      isRejected: true
    }
  }
}

/**
 * Type guard to check whether a reflected value represents a fulfilled state
 */
export function isFulfilled<T>(
  reflected: Reflected<T>
): reflected is ReflectedFulfilled<T> {
  return "value" in reflected
}

/**
 * Type guard to check whether a reflected value represents a rejected state
 */
export function isRejected<T>(
  reflected: Reflected<T>
): reflected is ReflectedRejected {
  return "reason" in reflected
}
