import { query } from "./_generated/server";
export const getEnv = query({
  args: {},
  handler: async (ctx) => {
    return {
      CONVEX_SITE_URL: process.env.CONVEX_SITE_URL,
      NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
      JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY ? "SET" : "NOT SET",
    };
  },
});
