import { clientSchema, validateEnv } from "./env.schema";

// Imported for side effects from instrumentation.ts: validates client
// environment variables at server startup and throws on invalid config.
validateEnv(clientSchema, process.env, "client");
