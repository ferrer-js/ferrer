import type { Context, Element } from "./atoms.js"
import type { Name } from "./name.js"
import type { TraceVector } from "./tracing.js"

/**
 * A `Registry` is *synchronous* store of bindings from `Name`s to `Element`s.
 * They are used within domains to manage local registrations.
 */
export interface Registry {
  /**
   * Synchronously locate all registrations matching the given pattern.
   */
  match(pattern: Name): Registration[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(name: Name, element: Element<any, any>): void
}

/** Entry in a `Registry` */
export type Registration = { name: Name; element: Element }

/** The result of resolving a pattern to an element. */
export type Resolution = { name: Name; element: Element }

/** Resolves a pattern to a single `Element` whose name matches the pattern. */
export interface Resolver {
  resolve(pattern: Name): Promise<Resolution | undefined>
}

export interface DomainBackend {
  createContext(
    parentContext: Context | undefined,
    resolver?: Resolver,
    traceVector?: TraceVector
  ): Context
}
