/**
 * Convex Auth Configuration
 * Points to our custom OIDC provider (served from Convex HTTP actions)
 * 
 * IMPORTANT: domain has a specific path `/auth-v2` attached to bust
 * Convex's internal 1-hour JWKS cache for the root domain.
 */
export default {
  providers: [
    {
      domain: (process.env.CONVEX_SITE_URL || "https://rosy-vulture-342.convex.site") + "/auth-v2",
      applicationID: "notion-app-auth",
    },
  ],
};
