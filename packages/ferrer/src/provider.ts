import type { Name, TypedName, UserResource } from "./core-types.js"
import { matches } from "./pattern-matching.js"

export type ProviderFn<TArg, TResult> = (
  context: Context,
  arg: TArg
) => Promise<TResult>

export abstract class Resource<TArg = unknown, TResult = unknown> {
  abstract use(context: Context, arg: TArg): Promise<TResult>

  dispose(): void {}

  [Symbol.dispose]() {
    this.dispose()
  }

  safeDispose() {
    // TODO: log error to context
    try {
      this.dispose()
    } catch (err) {
      console.error(err)
    }
  }
}

export class FunctionResource<
  TArg = unknown,
  TResult = unknown
> extends Resource<TArg, TResult> {
  fn: ProviderFn<TArg, TResult>
  constructor(fn: ProviderFn<TArg, TResult>) {
    super()
    this.fn = fn
  }
  override use(context: Context, arg: TArg): Promise<TResult> {
    return this.fn(context, arg)
  }
}

export abstract class Provider<TArg = unknown, TResult = unknown> {
  abstract get(pattern: Name): Promise<Resource<TArg, TResult>>
}

export class StaticProvider<TArg = unknown, TResult = unknown> extends Provider<
  TArg,
  TResult
> {
  staticResource: Resource<TArg, TResult>
  constructor(staticResource: Resource<TArg, TResult>) {
    super()
    this.staticResource = staticResource
  }
  override get(_pattern: Name): Promise<Resource<TArg, TResult>> {
    return Promise.resolve(this.staticResource)
  }
}

export class Resolver {
  _providers: Map<Name, Provider> = new Map()

  bind(name: Name, provider: Provider) {
    this._providers.set(name, provider)
  }

  resolve(pattern: Name): Promise<Provider | undefined> {
    let provider: Provider | undefined = undefined
    this._providers.forEach((prov, name) => {
      if (matches(name, pattern)) {
        provider = prov
      }
    })
    return Promise.resolve(provider)
  }
}

/**
 * The internal state of a resource lifecycle, from `find` to `dispose`.
 */
class Lifecycle<TArg = unknown, TResult = unknown> {
  pattern: Name
  context: Context
  disposed = false
  provider?: Provider
  resource?: Resource<TArg, TResult>
  resolver: Resolver

  constructor(pattern: Name, context: Context, resolver: Resolver) {
    this.pattern = pattern
    this.context = context
    this.resolver = resolver
  }

  dispose(): void {
    this.disposed = true
    this.invalidate()
  }

  invalidate(): void {
    if (this.resource) {
      this.resource.safeDispose()
    }
    this.resource = undefined
    this.provider = undefined
  }

  async resolve(): Promise<boolean> {
    // TODO: better error
    if (this.disposed) throw new Error("resolve when disposed")
    // Cached
    // TODO: ttl
    if (this.provider) return true
    // Fetch provider
    // TODO: retries, treat resolver failure as transient?
    const provider = await this.resolver.resolve(this.pattern)
    if (provider === undefined) throw new Error("unresolved pattern")
    this.provider = provider
    return true
  }

  async get(): Promise<boolean> {
    // TODO: better error
    if (this.disposed) throw new Error("get when disposed")
    // TODO: transient error, this should send us back to resolve
    if (!this.provider) throw new Error("invalidated")
    // TODO: error handling
    const resource = await this.provider.get(this.pattern)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this.disposed) {
      resource.safeDispose()
      throw new Error("resource handle disposed while acquiring resource")
    }
    this.resource = resource as Resource<TArg, TResult>
    return true
  }

  async use(arg: TArg): Promise<TResult> {
    if (this.disposed || !this.resource) {
      throw new Error("missing resource")
    }
    // eslint-disable-next-line no-useless-catch
    try {
      // TODO: spawn child context
      return await this.resource.use(this.context, arg)
    } catch (err) {
      // TODO: transient = invalidate and retry
      throw err
    }
  }
}

export class Context {
  resolver: Resolver = new Resolver()
  parentContext?: Context

  spawn() {}

  bind<TArg, TResult>(
    name: TypedName<TArg, TResult>,
    // XXX: eslint doesnt support NoInfer correctly yet
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    methodOrProvider: NoInfer<ProviderFn<TArg, TResult>> | Provider
  ): void {
    if (typeof methodOrProvider === "function") {
      return this.resolver.bind(
        name,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        new StaticProvider(new FunctionResource(methodOrProvider))
      )
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.resolver.bind(name, methodOrProvider)
  }

  find<TArg, TResult>(
    pattern: TypedName<TArg, TResult>
  ): UserResource<TArg, TResult> {
    const lifecycle = new Lifecycle<TArg, TResult>(pattern, this, this.resolver)

    // TODO: type assertions here are a bit sloppy and probably could be fixed
    // but this is correct.
    return Object.assign(
      async (arg: TArg | undefined) => {
        await lifecycle.resolve()
        await lifecycle.get()
        return lifecycle.use((arg ?? {}) as TArg)
      },
      {
        [Symbol.dispose]: () => {
          lifecycle.dispose()
        }
      }
    ) as UserResource<TArg, TResult>
  }
}
