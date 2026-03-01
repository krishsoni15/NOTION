/**
 * Convex Auth Configuration
 * Points to our custom OIDC provider (served from Convex HTTP actions)
 * domain is set to CONVEX_SITE_URL which Convex auto-sets for each deployment
 */
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
