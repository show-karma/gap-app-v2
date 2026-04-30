import { LangfuseWeb } from "langfuse";

let cached: LangfuseWeb | null | undefined;

export function getLangfuseWeb(): LangfuseWeb | null {
  if (cached !== undefined) return cached;

  const publicKey = process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY;
  if (!publicKey) {
    cached = null;
    return cached;
  }

  const baseUrl = process.env.NEXT_PUBLIC_LANGFUSE_HOST;

  cached = new LangfuseWeb({
    publicKey,
    ...(baseUrl ? { baseUrl } : {}),
  });
  return cached;
}
