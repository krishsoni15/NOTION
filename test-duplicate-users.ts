require("dotenv").config({ path: ".env.local" });
const { ConvexHttpClient } = require("convex/browser");
const { api } = require("./convex/_generated/api");

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
client.query(api.grn.debugUsers).then(console.log).catch(console.error);
