import { AsyncLocalStorage } from 'async_hooks';

interface AppAsyncStore {
  correlationId: string;
}

export const asyncContext = new AsyncLocalStorage<AppAsyncStore>();
