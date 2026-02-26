/**
 * Convex Auth Configuration
 * Points to our custom OIDC provider (served from Convex HTTP actions)
 */
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL || "https://rosy-peacock-841.convex.site",
      applicationID: "convex",
    },
  ],
};
