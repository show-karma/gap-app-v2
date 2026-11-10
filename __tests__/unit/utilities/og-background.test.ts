/**
 * @vitest-environment node
 */
import * as Sentry from "@sentry/nextjs";
import {
  getOgBackgroundImage,
  OG_BACKGROUND_PATH,
  resetOgBackgroundImageForTests,
} from "@/utilities/og-background";

const readFileMock = vi.hoisted(() => vi.fn());

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  readFileMock.mockImplementation(actual.readFile);
  return { ...actual, default: { ...actual, readFile: readFileMock }, readFile: readFileMock };
});

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const JPEG_DATA_URI = /^url\(data:image\/jpeg;base64,([A-Za-z0-9+/=]+)\)$/;

describe("getOgBackgroundImage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    readFileMock.mockImplementation(actual.readFile);
    resetOgBackgroundImageForTests();
  });

  it("inlines the committed JPEG from public/ as a data URI", async () => {
    const value = await getOgBackgroundImage();

    const match = value.match(JPEG_DATA_URI);
    expect(match).not.toBeNull();
    const bytes = Buffer.from(match?.[1] ?? "", "base64");
    // JPEG SOI marker, and small enough that inlining it stays cheap.
    expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
    expect(bytes.length).toBeLessThan(50 * 1024);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("reads the file once per server instance", async () => {
    await getOgBackgroundImage();
    await getOgBackgroundImage();

    expect(readFileMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to the CDN URL and reports to Sentry when the file is missing", async () => {
    const error = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    readFileMock.mockRejectedValueOnce(error);

    const value = await getOgBackgroundImage();

    expect(value).toMatch(new RegExp(`^url\\(https?://[^)]+${OG_BACKGROUND_PATH}\\)$`));
    expect(Sentry.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ tags: expect.objectContaining({ asset: "og-background" }) })
    );
  });
});
