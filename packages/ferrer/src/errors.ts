import type { Context } from "./core-types.js"
import type { Name } from "./Name.js"

export function isTransientError(err: unknown): err is ErrorWithTransience {
  if (
    err instanceof Error &&
    "isTransient" in err &&
    Boolean(err.isTransient)
  ) {
    return true
  } else {
    return false
  }
}

export type ErrorWithTransience = Error & { isTransient?: boolean }

/**
 * An error taking place within a Ferrer context
 */
export class FerrerError extends Error {
  /**
   * Is the error transient?
   */
  isTransient: boolean = false

  constructor(_context: Context, message?: string) {
    super(message)
  }
}

export class UnresolvedPatternError extends FerrerError {
  override isTransient: boolean = true
  constructor(context: Context, pattern: Name) {
    super(context, `Unresolved pattern: ${JSON.stringify(pattern)}`)
    this.isTransient = true
  }
}

export class EarlyDisposalError extends FerrerError {
  override isTransient: boolean = false
}
