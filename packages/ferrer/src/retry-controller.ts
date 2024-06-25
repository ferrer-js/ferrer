export class RetryController {
  delay(): Promise<void> {
    return Promise.resolve()
  }

  shouldRetry(): boolean {
    return true
  }

  transientError(_err: Error) {}

  combinedError(): Error {
    // TODO: marshal and combine all errors
    return new Error("RetryController.combinedError")
  }
}
