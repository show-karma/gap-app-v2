import { setupServer } from "msw/node";
import { defaultHandlers } from "./handlers";

export const server = setupServer(...defaultHandlers());

export function installMswLifecycle() {
  beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}
