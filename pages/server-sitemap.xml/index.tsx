import { getServerSideSitemapIndexLegacy } from "next-sitemap";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  return getServerSideSitemapIndexLegacy(ctx, [
    "https://gap.karmahq.xyz/server-sitemaps/projects.xml",
    "https://gap.karmahq.xyz/server-sitemaps/communities.xml",
  ]);
};

// Default export to prevent next.js errors
export default function Sitemap() {}
