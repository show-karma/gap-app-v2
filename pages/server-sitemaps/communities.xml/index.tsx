import { ISitemapField, getServerSideSitemapLegacy } from "next-sitemap";
import { GetServerSideProps } from "next";
import { chosenCommunities } from "@/utilities/chosenCommunities";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const paths: ISitemapField[] = chosenCommunities().map((community) => ({
    loc: `https://gap.karmahq.xyz/${community.slug || community.uid}`,
    lastmod: new Date().toISOString(),
    changefreq: "daily",
    priority: 0.7,
  }));

  return getServerSideSitemapLegacy(ctx, paths);
};

// Default export to prevent next.js errors
export default function Sitemap() {}
