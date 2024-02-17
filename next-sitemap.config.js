/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://gap.karmahq.xyz',
  generateRobotsTxt: true,
  // generateIndexSitemap: false,
  exclude: ['/stats', '/server-sitemap-index.xml'],
  sitemapSize: 30000,
  robotsTxtOptions: {
    additionalSitemaps: ['https://gap.karmahq.xyz/server-sitemap-index.xml'],
  },
};
