import { isObject, type SerializableObject } from "@ferrer/utils"
import type {
  Atom,
  AtomFunction,
  AtomImpl,
  Context,
  Domain,
  Element,
  Name,
  Registration,
  Registry,
  Resolution,
  Resolver,
  TypedName
} from "./core-types.js"
import { Lifecycle } from "./lifecycle.js"
import { matches } from "./pattern-matching.js"

/**
 * An `Element` whose `Atom`s are just direct calls to a simple async function.
 */
export class FunctionElement<TArg = unknown, TResult = unknown>
  implements Element<TArg, TResult>
{
  fn: AtomFunction<TArg, TResult>
  constructor(fn: AtomFunction<TArg, TResult>) {
    this.fn = fn
  }
  getAtom(pattern: Name, _context: Context): Promise<AtomImpl<TArg, TResult>> {
    return Promise.resolve(
      Object.assign(this.fn, {
        [Symbol.dispose]: () => {},
        requestedPattern: pattern
      })
    )
  }
}

/** A trivial implementation of `Registry` */
export class BasicRegistry implements Registry {
  _registrations: Registration[] = []

  match(pattern: Name): Registration[] {
    return this._registrations.flatMap((reg) =>
      matches(reg.name, pattern) ? [reg] : []
    )
  }

  register(name: Name, element: Element) {
    this._registrations.push({ name, element })
  }
}

/** A `Resolver` that pulls directly from a `Registry`. */
export class RegistryResolver implements Resolver {
  registry: Registry
  filter: (registration: Registration) => boolean
  constructor(
    registry: Registry,
    filter: (registration: Registration) => boolean = () => true
  ) {
    this.registry = registry
    this.filter = filter
  }
  resolve(pattern: Name): Promise<Resolution | undefined> {
    const results = this.registry.match(pattern).filter(this.filter)
    return Promise.resolve(results[0] ?? undefined)
  }
}

export class BaseContext implements Context {
  declare ["constructor"]: typeof BaseContext

  domain: Domain
  parentContext?: Context
  resolver: Resolver

  constructor(domain: Domain, parentContext?: Context, resolver?: Resolver) {
    const inheritedResolver =
      parentContext instanceof BaseContext ? parentContext.resolver : undefined
    const finalResolver = resolver ?? inheritedResolver

    if (!finalResolver) {
      throw new Error(
        "Context.constructor(): must provide a parent context or resolver"
      )
    }
    this.resolver = finalResolver
    this.parentContext = parentContext
    this.domain = domain
  }

  /**
   * Locate a resource matching the given pattern within this context.
   */
  find<TArg, TResult>(pattern: TypedName<TArg, TResult>): Atom<TArg, TResult> {
    const lifecycle = new Lifecycle(this.domain, pattern, this)

    return Object.assign(
      (arg?: TArg) => {
        return lifecycle.run(arg) as Promise<TResult>
      },
      {
        [Symbol.dispose]: () => {
          lifecycle.dispose()
        },
        requestedPattern: pattern
      }
    )
  }
}

function isElement(x: unknown): x is Element {
  return isObject(x) && "getAtom" in x && typeof x.getAtom === "function"
}

/**
 * A collection of registered, named resources. Resources within the same
 * `Domain` can call each other directly. When receiving or requesting
 * resources from other domains, a `Portal` must be traversed.
 */
export class BasicDomain implements Domain {
  /** Resources local to this domain. */
  registry: Registry = new BasicRegistry()
  /** Resolver that only resolves directly from the domain's registry. */
  internalResolver: Resolver = new RegistryResolver(this.registry)
  /** Portals through which resources in this domain can look up and access resources in other domains. */
  egresses: Egress[] = []
  /** Portals through which resources or end users outside this domain can use resources inside this domain. */
  ingresses: Ingress[] = [new Ingress(this)]
  localIngress: Ingress = this.ingresses[0]
  // TODO: default resolver that checks outPortals
  resolver: Resolver = this.internalResolver
  ingressResolver: Resolver = this.internalResolver

  bind<TArg, TResult>(
    name: TypedName<TArg, TResult>,
    element:
      | NoInfer<AtomFunction<TArg, TResult>>
      | NoInfer<Element<TArg, TResult>>
  ): void {
    if (!isElement(element)) {
      this.registry.register(
        name,
        new FunctionElement(element as AtomFunction<TArg, TResult>)
      )
      return
    }
    this.registry.register(name, element)
    return
  }

  createContext(
    parentContext: Context | undefined,
    resolver?: Resolver
  ): Context {
    return new BaseContext(this, parentContext, resolver ?? this.resolver)
  }
}

type ContextSecurity = SerializableObject

export type ContextMetadata = {
  security?: ContextSecurity
  [key: string]: SerializableObject | undefined
}

/**
 * A portal through which resources inside a domain can be used from outside
 * that domain. `Ingress`s typically perform security checks and tracing
 * on incoming requests, and strip any potentially sensitive data from
 * outgoing responses, as well as encoding and network transport.
 */
export class Ingress {
  domain: BasicDomain

  constructor(domain: BasicDomain) {
    this.domain = domain
  }

  /**
   * Create a handle to an `Atom` inside the domain that can be used from
   * outside the domain. Creates a new root context deriving from the given data
   */
  externalize<TArg, TResult>(
    pattern: TypedName<TArg, TResult>
  ): Atom<TArg, TResult> {
    const rootContext = this.domain.createContext(
      undefined,
      this.domain.ingressResolver
    )
    const lifecycle = new Lifecycle(this.domain, pattern, rootContext)

    return Object.assign(
      (arg?: TArg) => {
        return lifecycle.run(arg) as Promise<TResult>
      },
      {
        [Symbol.dispose]: () => {
          lifecycle.dispose()
        },
        requestedPattern: pattern
      }
    )
  }
}

/**
 * A portal through which resources inside of a domain can access resources
 * in other domains.
 */
export class Egress {}
