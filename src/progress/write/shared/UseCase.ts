export interface UseCase<TRequest, TResult = void> {
  handle(request: TRequest): Promise<TResult>
}
