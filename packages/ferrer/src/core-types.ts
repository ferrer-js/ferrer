import type { SerializableObject } from "@ferrer/utils"

/** The name of a resource, which is ultimately a plain JSON object. */
export type Name = SerializableObject

export const TArg$ = Symbol.for("ferrer.type.arg")
export const TResult$ = Symbol.for("ferrer.type.result")

/** A `Name` that carries additional type information about the argument and return value from a resource. */
export type TypedName<TArg, TResult> = Name & {
  [TArg$]: TArg
  [TResult$]: TResult
}

/**
 * Create a ferrer name that carries TypeScript information along with it. Arguments
 * must be serializable for general names; use `local_name` for non-serializable
 * arguments that cannot cross domain boundaries.
 */
export function name<
  TArg extends SerializableObject | undefined,
  TResult extends SerializableObject | undefined
>(name: Name) {
  return name as TypedName<TArg, TResult>
}

/**
 * A typed ferrer name that requires locality. Requests for this atom
 * may not cross domain boundaries. In exchange, this atom may receive and
 * return non-serializable objects, since it is guaranteed to be
 * an in-process async function call.
 */
export function local_name<TArg, TResult>(name: Name) {
  return Object.assign(name, { local: true }) as Name as TypedName<
    TArg,
    TResult
  >
}

/**
 * Forcibly escapes from the TypeScript type system by typing a resource
 * as `any`.
 */
export function untyped_name(name: Name) {
  // `any` ok here, as user is asking for untyped name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return name as TypedName<any, any>
}

/** Metadata about a requested atom. */
export type AtomMetadata = {
  /** The pattern match that was requested. */
  readonly requestedPattern: Name
}

type OptionalWhenUndefined<TArg> = TArg extends undefined ? [] : [arg: TArg]

/**
 * `Atom`s are the core building block of ferrer systems. They are asynchronous
 * functions that lazily refer to a computation that may be executed anywhere. * Each time the `Atom` is invoked, the computation it represents is carried
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
 * A plain async function implementing an `Atom`, taking an implied `Context`
 * in which the atom will execute.
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
}

/**
 * A generic logging function, designed to be adaptible to any structured
 * logging library.
 *
 * @param tags Structural tags to be added to the log message.
 * @param message Log message body.
 * @param rest Optional additional parameters to be passed to the backend logging library. Usually these will correspond to printf-style specifiers in `message`.
 */
export type LoggingFunction = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (message: string, ...rest: any[]): void
  (
    tags: object,
    message: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...rest: any[]
  ): void
}

/**
 * Each `Context` provides a generic interface for logging, which will
 * interoperate with a backend structured logging library.
 */
export interface Logging {
  fatal: LoggingFunction
  error: LoggingFunction
  warn: LoggingFunction
  info: LoggingFunction
  debug: LoggingFunction
  trace: LoggingFunction
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

export interface Domain {
  bind<TArg, TResult>(
    name: TypedName<TArg, TResult>,
    element:
      | NoInfer<AtomFunction<TArg, TResult>>
      | NoInfer<Element<TArg, TResult>>
  ): void

  createContext(
    parentContext: Context | undefined,
    resolver?: Resolver
  ): Context
}
