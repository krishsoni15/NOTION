import { config } from "dotenv";
config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
let issuer = "";
if (url) {
    issuer = url.replace(".cloud", ".site") + "/auth-v2";
} else {
    issuer = (process.env.CONVEX_SITE_URL || "https://notion-auth.local") + "/auth-v2";
}
console.log("Issuer:", issuer);
