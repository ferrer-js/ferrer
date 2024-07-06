import type { Logging } from "./logging.js"
import type { Name, TypedName } from "./name.js"
import type { TraceVector } from "./tracing.js"

/** Metadata about a requested atom. */
export type AtomMetadata = {
  /** The pattern match that was requested. */
  readonly requestedPattern: Name
  /** The Element of the atom */
  readonly element: Element
}

// Type-fu for atom call arguments. Allows calling atoms with no arguments when needed
type AtomArgs<TArg> = TArg extends undefined ? [] : [arg: TArg]

/**
 * `Atom`s are the core building block of ferrer systems. They are asynchronous
 * functions that lazily refer to a computation that may be executed anywhere.
 * Each time the `Atom` is invoked, the computation it represents is carried
 * out automatically by the ferrer system, including locating the required
 * resources, marshalling the data, and returning the response.
 *
 * `Atom`s are `Disposable` and must be disposed when their callers are
 * finished with them. This is best done using explicit resource management
 * with the `using` keyword.
 */
export type Atom<TArg, TResult> = ((
  ...args: AtomArgs<TArg>
) => Promise<TResult>) &
  AtomMetadata &
  Disposable

/**
 * A plain async function implementing an `Atom`, which receives the explicit `Context`
 * in which the atom is being executed.
 */
export type AtomImplFunction<TArg, TResult> = (
  context: Context,
  arg: TArg
) => Promise<TResult>

/**
 * Implementation of an `Atom`. This is distinguished from the `Atom` itself
 * in that the context is explicit within the atom implementation.
 */
export type AtomImpl<TArg, TResult> = AtomImplFunction<TArg, TResult> &
  Disposable &
  AtomMetadata

/**
 * Each `Atom` has an `Element` that defines its characteristics.
 * Names are bound to `Element`s, and they are responsible for creating
 * corresponding atoms.
 */
export interface Element<TArg = unknown, TResult = unknown> {
  /**
   * Retrieve an `Atom` implementation for this element.
   *
   * @param pattern The pattern originally requested by the consumer. Note that
   * pattern matching has already been performed at this point; this value
   * should not be used to select different types of atoms, but rather only if
   * the internal state of the atom needs to depend upon it.
   */
  getAtom(
    pattern: Name,
    requestingContext: Context
  ): Promise<AtomImpl<TArg, TResult>>

  readonly name: Name
}

/**
 * `Context` is the shared information available to an `Atom` while it is
 * running. The primary use of `Context` is to look up and use other `Atom`s.
 */
export interface Context {
  /** Locate an atom matching the given pattern. */
  find<TArg, TResult>(pattern: TypedName<TArg, TResult>): Atom<TArg, TResult>

  /** The logging interface for this context */
  readonly log: Logging

  /** The base trace vector for this context. */
  readonly trace: TraceVector

  /** The domain containing this context. */
  readonly domain: Domain
}

/**
 * `Domain`s are the unit of resource isolation in Ferrer. Each `Domain` has
 * its own collection of registered `Name`s mapping to `Element`s. Access to other
 * atoms within the domain is handled by local
 * async function calls; however, if a resource
 * lives in another domain, it must be accessed
 * using explicit `Ingress` and `Egress` objects
 */
export interface Domain {
  /**
   * Bind a `Name` to an `Element` within this `Domain`.
   */
  bind<TArg, TResult>(
    name: TypedName<TArg, TResult>,
    element:
      | NoInfer<AtomImplFunction<TArg, TResult>>
      | NoInfer<Element<TArg, TResult>>
  ): void
}
