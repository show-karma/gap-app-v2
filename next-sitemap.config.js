/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://karmahq.xyz",
  generateRobotsTxt: true,
  // generateIndexSitemap: false,
  exclude: ["/stats"],
  sitemapSize: 30000,
  robotsTxtOptions: {
    additionalSitemaps: [
      "https://karmahq.xyz/sitemaps/projects/sitemap.xml",
      "https://karmahq.xyz/sitemaps/communities/sitemap.xml",
    ],
  },
}
