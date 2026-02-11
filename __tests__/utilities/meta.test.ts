import {
  customMetadata,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  defaultMetadata,
  ogMeta,
  SITE_URL,
  twitterMeta,
} from "@/utilities/meta";

describe("meta utilities", () => {
  describe("constants", () => {
    it("should have a valid SITE_URL", () => {
      expect(SITE_URL).toBe("https://karmahq.xyz");
    });

    it("should include project name in DEFAULT_TITLE", () => {
      expect(DEFAULT_TITLE).toContain("Karma");
    });

    it("should have a non-empty DEFAULT_DESCRIPTION", () => {
      expect(DEFAULT_DESCRIPTION).toBeTruthy();
      expect(DEFAULT_DESCRIPTION.length).toBeGreaterThan(20);
    });

    it("should have an OG image URL under the site domain", () => {
      expect(DEFAULT_OG_IMAGE).toMatch(/^https:\/\/karmahq\.xyz\/.+/);
    });
  });

  describe("ogMeta", () => {
    it("should have the site URL", () => {
      expect(ogMeta.url).toBe(SITE_URL);
    });

    it("should use DEFAULT_TITLE as siteName", () => {
      expect(ogMeta.siteName).toBe(DEFAULT_TITLE);
    });

    it("should have type 'website'", () => {
      expect(ogMeta.type).toBe("website");
    });

    it("should include the default OG image", () => {
      expect(ogMeta.images).toContain(DEFAULT_OG_IMAGE);
    });
  });

  describe("twitterMeta", () => {
    it("should use summary_large_image card type", () => {
      expect(twitterMeta.card).toBe("summary_large_image");
    });

    it("should reference the @karmahq_ account", () => {
      expect(twitterMeta.creator).toBe("@karmahq_");
      expect(twitterMeta.site).toBe("@karmahq_");
    });

    it("should include title and description", () => {
      expect(twitterMeta.title).toBe(DEFAULT_TITLE);
      expect(twitterMeta.description).toBe(DEFAULT_DESCRIPTION);
    });
  });

  describe("defaultMetadata", () => {
    it("should have a title template with project name suffix", () => {
      const title = defaultMetadata.title as { default: string; template: string };
      expect(title.template).toContain("Karma");
      expect(title.template).toContain("%s");
    });

    it("should use DEFAULT_TITLE as the default title", () => {
      const title = defaultMetadata.title as { default: string; template: string };
      expect(title.default).toBe(DEFAULT_TITLE);
    });

    it("should set metadataBase to the site URL", () => {
      expect(defaultMetadata.metadataBase).toEqual(new URL(SITE_URL));
    });

    it("should have a canonical URL for the root", () => {
      expect(defaultMetadata.alternates?.canonical).toBe("/");
    });

    it("should set favicon", () => {
      const icons = defaultMetadata.icons as { icon: string };
      expect(icons.icon).toBe("/favicon.ico");
    });

    it("should include openGraph metadata", () => {
      expect(defaultMetadata.openGraph).toBeDefined();
    });

    it("should include twitter metadata", () => {
      expect(defaultMetadata.twitter).toBeDefined();
    });
  });

  describe("customMetadata", () => {
    it("should use defaults when called with empty object", () => {
      const result = customMetadata({});
      expect(result.title).toBe(DEFAULT_TITLE);
      expect(result.description).toBe(DEFAULT_DESCRIPTION);
    });

    it("should override title and description", () => {
      const result = customMetadata({
        title: "Custom Page",
        description: "Custom description",
      });
      expect(result.title).toBe("Custom Page");
      expect(result.description).toBe("Custom description");
    });

    it("should set canonical URL when path is provided", () => {
      const result = customMetadata({ path: "/communities" });
      expect(result.alternates?.canonical).toBe("/communities");
    });

    it("should not include alternates when path is omitted", () => {
      const result = customMetadata({});
      expect(result.alternates).toBeUndefined();
    });

    it("should propagate title and description to openGraph", () => {
      const result = customMetadata({
        title: "OG Title",
        description: "OG Description",
      });
      const og = result.openGraph as Record<string, unknown>;
      expect(og.title).toBe("OG Title");
      expect(og.description).toBe("OG Description");
    });

    it("should propagate title and description to twitter", () => {
      const result = customMetadata({
        title: "Twitter Title",
        description: "Twitter Description",
      });
      const twitter = result.twitter as Record<string, unknown>;
      expect(twitter.title).toBe("Twitter Title");
      expect(twitter.description).toBe("Twitter Description");
    });

    it("should preserve base ogMeta fields", () => {
      const result = customMetadata({ title: "Test" });
      const og = result.openGraph as Record<string, unknown>;
      expect(og.url).toBe(SITE_URL);
      expect(og.siteName).toBe(DEFAULT_TITLE);
      expect(og.type).toBe("website");
    });

    it("should preserve base twitterMeta fields", () => {
      const result = customMetadata({ title: "Test" });
      const twitter = result.twitter as Record<string, unknown>;
      expect(twitter.card).toBe("summary_large_image");
      expect(twitter.creator).toBe("@karmahq_");
      expect(twitter.site).toBe("@karmahq_");
    });
  });
});
