import {
  type ClientEnv,
  clientSchema,
  type ServerEnv,
  serverSchema,
  validateEnv,
} from "./env.schema";

/**
 * Validated and typed client environment variables.
 * Safe to use in both server and client code.
 */
const clientEnv = validateEnv(clientSchema, process.env, "client");

let _serverEnv: ServerEnv | null = null;

/**
 * Validated and typed server-only environment variables.
 * Only use in server-side code (API routes, next.config, instrumentation).
 */
function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() must not be called on the client");
  }
  if (!_serverEnv) {
    _serverEnv = validateEnv(serverSchema, process.env, "server");
  }
  return _serverEnv;
}
