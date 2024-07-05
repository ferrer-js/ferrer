import { type Logging } from "./primitives/logging.js"
import { type Name, type TypedName } from "./primitives/name.js"
import { type TraceVector } from "./primitives/tracing.js"

/** Metadata about a requested atom. */
export type AtomMetadata = {
  /** The pattern match that was requested. */
  readonly requestedPattern: Name
}

type OptionalWhenUndefined<TArg> = TArg extends undefined ? [] : [arg: TArg]

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
  ...args: OptionalWhenUndefined<TArg>
) => Promise<TResult>) &
  AtomMetadata &
  Disposable

/**
 * A plain async function implementing an `Atom`, which receives the explicit `Context`
 * in which the atom is being executed.
 */
export type AtomFunction<TArg, TResult> = (
  context: Context,
  arg: TArg
) => Promise<TResult>

/**
 * Implementation of an `Atom`. This is distinguished from the `Atom` itself
 * in that with `Atom`s, the context is implied at the time of atom creation,
 * but here, the context is passed as an argument.
 */
export type AtomImpl<TArg, TResult> = AtomFunction<TArg, TResult> &
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

  /** The resolver for this context */
  readonly resolver: Resolver

  /** The logging interface for this context */
  readonly log: Logging

  /** The base trace vector for this context. */
  readonly trace: TraceVector
}

/** The result of resolving a pattern to an element. */
export type Resolution = { name: Name; element: Element }

/** Resolves a pattern to a single `Element` whose name matches the pattern. */
export interface Resolver {
  resolve(pattern: Name): Promise<Resolution | undefined>
}

/**
 * A `Registry` is *synchronous* store of bindings from `Name`s to `Element`s.
 * They are used within domains to manage local registrations.
 */
export interface Registry {
  match(pattern: Name): Registration[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(name: Name, element: Element<any, any>): void
}

/** Entry in a `Registry` */
export type Registration = { name: Name; element: Element }

/**
 * `Domain`s are the unit of isolation in Ferrer. Each `Domain` has
 * its own collection of registered `Name`s mapping to `Element`s, and
 * attempts to access names in other domains can only happen
 * via serializable objects sent via an `Egress` from the source
 * domain to a matching `Ingress` of the target domain.
 */
export interface Domain {
  /**
   * Bind a `Name` to an `Element` within this `Domain`.
   */
  bind<TArg, TResult>(
    name: TypedName<TArg, TResult>,
    element:
      | NoInfer<AtomFunction<TArg, TResult>>
      | NoInfer<Element<TArg, TResult>>
  ): void

  createContext(
    parentContext: Context | undefined,
    resolver?: Resolver,
    traceVector?: TraceVector
  ): Context
}
