const { ConvexHttpClient } = require("convex/browser");
const { api } = require("./convex/_generated/api");
// Try without token, it will fail auth, but we can verify if it's regex or schema
console.log("Creating client");
