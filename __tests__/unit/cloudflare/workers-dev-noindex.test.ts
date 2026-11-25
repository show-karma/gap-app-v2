import { withWorkersDevNoindex } from "../../../cloudflare/workers-dev-noindex";

describe("withWorkersDevNoindex", () => {
  it("marks a response served on *.workers.dev as not to be indexed", async () => {
    const request = new Request("https://gap-app-v2-staging.example.workers.dev/communities");
    const response = new Response("page", {
      status: 200,
      headers: { "content-type": "text/html" },
    });
    const marked = withWorkersDevNoindex(request, response);
    expect(marked.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(marked.status).toBe(200);
    expect(marked.headers.get("content-type")).toBe("text/html");
    expect(await marked.text()).toBe("page");
  });

  it("replaces a weaker robots header, including on a redirect with immutable headers", () => {
    const request = new Request("https://gap-app-v2-pr-12.example.workers.dev/programs");
    const redirect = Response.redirect("https://gap-app-v2-pr-12.example.workers.dev/", 307);
    const marked = withWorkersDevNoindex(request, redirect);
    expect(marked.status).toBe(307);
    expect(marked.headers.get("location")).toBe("https://gap-app-v2-pr-12.example.workers.dev/");
    expect(marked.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("marks custom preview hosts as noindex when appEnv is preview", async () => {
    for (const url of [
      "https://staging.karmahq.org/communities",
      "https://cf-staging.merkador.app/",
    ]) {
      const response = new Response("staging page", {
        status: 200,
        headers: { "content-type": "text/html", "x-robots-tag": "index, follow" },
      });
      const marked = withWorkersDevNoindex(new Request(url), response, "preview");
      expect(marked.headers.get("x-robots-tag")).toBe("noindex, nofollow");
      expect(marked.status).toBe(200);
      expect(marked.headers.get("content-type")).toBe("text/html");
      expect(await marked.text()).toBe("staging page");
    }
  });

  it("leaves production custom domains untouched while still marking *.workers.dev", () => {
    for (const url of ["https://www.karmahq.org/", "https://app.opgrants.io/"]) {
      const response = new Response("page");
      expect(withWorkersDevNoindex(new Request(url), response, "production")).toBe(response);
    }

    const workersDev = new Request("https://gap-app-v2-production.example.workers.dev/");
    const marked = withWorkersDevNoindex(workersDev, new Response("page"), "production");
    expect(marked.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("leaves responses on any other host untouched when appEnv is omitted", () => {
    for (const url of ["https://example.org/", "https://workers.dev.example.org/"]) {
      const response = new Response("page");
      expect(withWorkersDevNoindex(new Request(url), response)).toBe(response);
    }
  });
});
