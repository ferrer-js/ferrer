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
