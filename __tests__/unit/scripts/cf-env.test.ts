/**
 * @vitest-environment node
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  exportBuildEnv,
  isPlaceholderValue,
  parsePublicEnv,
  RUNTIME_SECRETS,
  syncRuntimeSecrets,
} from "../../../scripts/cf-env.mjs";

interface CapturedStream {
  write: (chunk: string) => boolean;
  output: () => string;
}

function createStream(): CapturedStream {
  const chunks: string[] = [];
  return {
    write(chunk: string) {
      chunks.push(chunk);
      return true;
    },
    output() {
      return chunks.join("");
    },
  };
}

describe("cf-env", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  describe("isPlaceholderValue", () => {
    it("detects bracketed placeholder strings", () => {
      expect(isPlaceholderValue("[sensitive]")).toBe(true);
      expect(isPlaceholderValue("  [redacted]  ")).toBe(true);
      expect(isPlaceholderValue("real-secret-value")).toBe(false);
    });
  });

  describe("parsePublicEnv", () => {
    it("parses valid NEXT_PUBLIC_* entries, skips empty values and NEXT_PUBLIC_VERCEL_ENV", () => {
      const raw = [
        'NEXT_PUBLIC_RPC_BASE="https://base.example.com?key=abc=123"',
        "NEXT_PUBLIC_VERCEL_ENV=production",
        "NEXT_PUBLIC_EMPTY=",
        'NEXT_PUBLIC_ENV="production"',
        "NEXT_PUBLIC_LABEL=hello world",
      ].join("\n");

      expect(parsePublicEnv(raw)).toEqual([
        ["NEXT_PUBLIC_ENV", "production"],
        ["NEXT_PUBLIC_LABEL", "hello world"],
        ["NEXT_PUBLIC_RPC_BASE", "https://base.example.com?key=abc=123"],
      ]);
    });

    it("throws on any non-NEXT_PUBLIC_* key", () => {
      expect(() => parsePublicEnv("NEXT_PUBLIC_ENV=preview\nCRON_SECRET=supersecret\n")).toThrow(
        /Non-public variable "CRON_SECRET"/
      );
    });

    it("throws on bracket placeholder values", () => {
      expect(() => parsePublicEnv("NEXT_PUBLIC_PRIVY_APP_ID=[sensitive]\n")).toThrow(
        /redacted placeholder/
      );
    });
  });

  describe("exportBuildEnv", () => {
    it("masks values on stdout and writes heredoc entries to GITHUB_ENV", () => {
      const dir = mkdtempSync(join(tmpdir(), "cf-env-test-"));
      tempDirs.push(dir);
      const githubEnvPath = join(dir, "github.env");
      const stdout = createStream();

      const count = exportBuildEnv({
        raw: 'NEXT_PUBLIC_B="two"\nNEXT_PUBLIC_A="line1\\nline2"\n',
        githubEnvPath,
        stdout,
      });

      expect(count).toBe(2);
      const out = stdout.output();
      expect(out).toContain("::add-mask::line1\n");
      expect(out).toContain("::add-mask::line2\n");
      expect(out).toContain("::add-mask::two\n");
      expect(out).toContain("Exported 2 NEXT_PUBLIC_* variables for the build.\n");

      const written = readFileSync(githubEnvPath, "utf8");
      expect(written).toMatch(
        /^NEXT_PUBLIC_A<<EOF_NEXT_PUBLIC_A_[a-z0-9]+\nline1\nline2\nEOF_NEXT_PUBLIC_A_[a-z0-9]+\n/m
      );
      expect(written).toMatch(
        /^NEXT_PUBLIC_B<<EOF_NEXT_PUBLIC_B_[a-z0-9]+\ntwo\nEOF_NEXT_PUBLIC_B_[a-z0-9]+\n/m
      );
      expect(parseEnv('NEXT_PUBLIC_A="line1\\nline2"')).toEqual({ NEXT_PUBLIC_A: "line1\nline2" });
    });

    it("fails when CF_PUBLIC_ENV is empty or GITHUB_ENV is missing", () => {
      const stdout = createStream();
      expect(() => exportBuildEnv({ raw: "   ", githubEnvPath: "/tmp/env", stdout })).toThrow(
        /CF_PUBLIC_ENV is empty/
      );
      expect(() =>
        exportBuildEnv({ raw: "NEXT_PUBLIC_ENV=preview", githubEnvPath: "", stdout })
      ).toThrow(/GITHUB_ENV is not set/);
    });
  });

  describe("syncRuntimeSecrets", () => {
    it("skips unset secrets without calling runner", () => {
      const runner = vi.fn();
      const stdout = createStream();
      const stderr = createStream();

      const failed = syncRuntimeSecrets({
        env: {},
        wranglerArgs: ["--env", "staging"],
        runner: runner as never,
        stdout,
        stderr,
      });

      expect(failed).toBe(0);
      expect(runner).not.toHaveBeenCalled();
      for (const name of RUNTIME_SECRETS) {
        expect(stdout.output()).toContain(`${name}: not set in GitHub environment, skipped\n`);
      }
      expect(stderr.output()).toBe("");
    });

    it("passes set secrets via stdin to wrangler secret put", () => {
      const runner = vi.fn().mockReturnValue({ status: 0, stderr: "" });
      const stdout = createStream();
      const stderr = createStream();

      const failed = syncRuntimeSecrets({
        env: {
          CRON_SECRET: "cron-val",
          SANITY_VIEWER_TOKEN: "viewer-val",
        },
        wranglerArgs: ["--config", "wrangler.app.jsonc", "--env", "production"],
        runner: runner as never,
        stdout,
        stderr,
      });

      expect(failed).toBe(0);
      expect(runner).toHaveBeenCalledTimes(2);
      expect(runner).toHaveBeenNthCalledWith(
        1,
        "npx",
        [
          "wrangler",
          "secret",
          "put",
          "CRON_SECRET",
          "--config",
          "wrangler.app.jsonc",
          "--env",
          "production",
        ],
        { input: "cron-val", stdio: ["pipe", "ignore", "pipe"], encoding: "utf8" }
      );
      expect(runner).toHaveBeenNthCalledWith(
        2,
        "npx",
        [
          "wrangler",
          "secret",
          "put",
          "SANITY_VIEWER_TOKEN",
          "--config",
          "wrangler.app.jsonc",
          "--env",
          "production",
        ],
        { input: "viewer-val", stdio: ["pipe", "ignore", "pipe"], encoding: "utf8" }
      );
      expect(stdout.output()).toContain("CRON_SECRET: stored\n");
      expect(stdout.output()).toContain("SANITY_VIEWER_TOKEN: stored\n");
    });

    it("narrows secrets when only (CF_SECRETS) is set", () => {
      const runner = vi.fn().mockReturnValue({ status: 0, stderr: "" });
      const stdout = createStream();
      const stderr = createStream();

      const failed = syncRuntimeSecrets({
        env: {
          CRON_SECRET: "cron-val",
          SANITY_VIEWER_TOKEN: "viewer-val",
        },
        only: "CRON_SECRET",
        wranglerArgs: ["--env", "staging"],
        runner: runner as never,
        stdout,
        stderr,
      });

      expect(failed).toBe(0);
      expect(runner).toHaveBeenCalledTimes(1);
      expect(runner).toHaveBeenCalledWith(
        "npx",
        ["wrangler", "secret", "put", "CRON_SECRET", "--env", "staging"],
        { input: "cron-val", stdio: ["pipe", "ignore", "pipe"], encoding: "utf8" }
      );
    });

    it("refuses bracket placeholder values without calling runner", () => {
      const runner = vi.fn();
      const stdout = createStream();
      const stderr = createStream();

      const failed = syncRuntimeSecrets({
        env: {
          CRON_SECRET: "[sensitive]",
        },
        only: "CRON_SECRET",
        wranglerArgs: ["--env", "staging"],
        runner: runner as never,
        stdout,
        stderr,
      });

      expect(failed).toBe(1);
      expect(runner).not.toHaveBeenCalled();
      expect(stderr.output()).toContain("redacted placeholder");
    });

    it("returns non-zero failure count when runner exits non-zero", () => {
      const runner = vi.fn().mockReturnValue({ status: 1, stderr: "Authentication error" });
      const stdout = createStream();
      const stderr = createStream();

      const failed = syncRuntimeSecrets({
        env: {
          CRON_SECRET: "cron-val",
        },
        only: "CRON_SECRET",
        wranglerArgs: ["--env", "staging"],
        runner: runner as never,
        stdout,
        stderr,
      });

      expect(failed).toBe(1);
      expect(stderr.output()).toContain("CRON_SECRET: failed\nAuthentication error\n");
    });
  });
});
