import {
  TraceEventType,
  type AtomImpl,
  type Context,
  type Domain,
  type Element,
  type Name
} from "./core-types.js"
import {
  EarlyDisposalError,
  UnresolvedPatternError,
  isTransientError
} from "./errors.js"
import { RetryController } from "./retry-controller.js"

function safeDispose(context: Context, disposable: Disposable) {
  try {
    disposable[Symbol.dispose]()
  } catch (err) {
    // TODO: log
  }
}

class LifecycleCache {
  #element?: Element
  #atomImpl?: AtomImpl<unknown, unknown>
  context: Context

  constructor(context: Context) {
    this.context = context
  }

  getCachedElement() {
    return this.#element
  }
  getCachedAtomImpl() {
    return this.#atomImpl
  }
  replaceCachedElement(element: Element | undefined) {
    this.replaceCachedAtomImpl(undefined)
    this.#element = element
  }
  replaceCachedAtomImpl(atomImpl: AtomImpl<unknown, unknown> | undefined) {
    if (this.#atomImpl) {
      safeDispose(this.context, this.#atomImpl)
    }
    this.#atomImpl = atomImpl
  }
  clearCache() {
    this.replaceCachedElement(undefined)
  }
}

/**
 * The internal state of an `Atom` lifecycle, from `find` to `dispose`.
 * Exactly one `Lifecycle` exists for each acquired `Atom`, whereas a new
 * `Context` is generated every time an atom is called.
 */
export class Lifecycle {
  /** Domain within which the lifecycle of this resource will be contained. */
  readonly domain: Domain
  /** Pattern requested by the consumer of the resource. */
  pattern: Name
  /** Actual name resolved from the pattern, if found  */
  resolvedName?: Name
  /** Context in which this atom will be executed. */
  readonly context: Context
  disposed = false
  cache: LifecycleCache

  constructor(domain: Domain, pattern: Name, context: Context) {
    this.domain = domain
    this.pattern = pattern
    this.context = context
    this.cache = new LifecycleCache(context)
  }

  dispose(): void {
    this.disposed = true
    this.cache.clearCache()
  }

  isDisposed(): boolean {
    return this.disposed
  }

  async run(arg: unknown): Promise<unknown> {
    const retryController = new RetryController()

    while (retryController.shouldRetry()) {
      // Retry backoff
      await retryController.delay()

      // Check for early disposal
      if (this.isDisposed()) {
        throw new EarlyDisposalError(this.context)
      }

      try {
        // Resolution of element
        // Check cache
        let element = this.cache.getCachedElement()
        if (element === undefined) {
          // Resolve
          const resolution = await this.context.resolver.resolve(this.pattern)
          if (resolution === undefined) {
            throw new UnresolvedPatternError(this.context, this.pattern)
          }
          // Check for early disposal
          if (this.isDisposed()) {
            throw new EarlyDisposalError(this.context)
          }
          // Resolve succeeded
          element = resolution.element
          this.cache.replaceCachedElement(element)
        }

        // Obtain implementation
        let atomImpl = this.cache.getCachedAtomImpl()
        if (atomImpl === undefined) {
          // Get impl from element
          atomImpl = await element.getAtom(this.pattern, this.context)
          // Check for early disposal
          if (this.isDisposed()) {
            // Because we acquired a new atomImpl, we must dispose it
            safeDispose(this.context, atomImpl)
            throw new EarlyDisposalError(this.context)
          }
          this.cache.replaceCachedAtomImpl(atomImpl)
        }

        // Execute
        const executionContext = this.domain.createContext(
          this.context,
          undefined,
          this.context.trace.concat([
            [TraceEventType.DOMAIN_CALL, element.name]
          ])
        )
        const result = await atomImpl(executionContext, arg)

        // JIT disposal; okay since we have already completed the atom invocation
        if (this.isDisposed()) {
          this.cache.replaceCachedAtomImpl(undefined)
        }

        return result
      } catch (err) {
        // Any error invalidates the cache
        this.cache.clearCache()
        // A transient error triggers a retry
        if (isTransientError(err)) {
          retryController.transientError(err)
          continue
        }
        // A non-transient error is rethrown to the caller.
      }
    }

    // Out of retries; create a non-transient error that combines
    // all the transient errors that took place during the retry process.
    throw retryController.combinedError()
  }
}
