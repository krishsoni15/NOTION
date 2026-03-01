/**
 * Convex HTTP Router
 * Serves OIDC discovery and JWKS endpoints for custom JWT verification
 * 
 * IMPORTANT: Features explicit paths for /auth-v2/.well-known to bust Convex 1-hour cache
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

const serveOIDCConfig = httpAction(async (_ctx, request) => {
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}/auth-v2`;

    const config = {
        issuer: baseUrl,
        jwks_uri: `${baseUrl}/.well-known/jwks.json`,
        authorization_endpoint: `${baseUrl}/authorize`,
        token_endpoint: `${baseUrl}/token`,
        response_types_supported: ["id_token"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["RS256"],
    };

    return new Response(JSON.stringify(config), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=60",
        },
    });
});

const serveJWKS = httpAction(async () => {
    const pubKeyStr = process.env.JWT_PUBLIC_KEY || process.env.JWT_PUBLIC_JWK;

    if (pubKeyStr) {
        try {
            const jsonStr = pubKeyStr.startsWith("eyJ")
                ? (typeof Buffer !== "undefined" ? Buffer.from(pubKeyStr, "base64").toString("utf8") : atob(pubKeyStr))
                : pubKeyStr;

            const jwk = JSON.parse(jsonStr);
            if (!jwk.alg) jwk.alg = "RS256";
            if (!jwk.use) jwk.use = "sig";

            const jwks = { keys: [jwk] };
            return new Response(JSON.stringify(jwks), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "public, max-age=60",
                },
            });
        } catch (e) {
            console.error("Failed to parse JWT_PUBLIC_KEY:", e);
        }
    }

    return new Response(JSON.stringify({ keys: [] }), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
    });
});

// Cache busted paths
http.route({ path: "/auth-v2/.well-known/openid-configuration", method: "GET", handler: serveOIDCConfig });
http.route({ path: "/auth-v2/.well-known/jwks.json", method: "GET", handler: serveJWKS });

// Original paths (for anything still using them)
http.route({ path: "/.well-known/openid-configuration", method: "GET", handler: serveOIDCConfig });
http.route({ path: "/.well-known/jwks.json", method: "GET", handler: serveJWKS });

// Health check
http.route({
    path: "/health",
    method: "GET",
    handler: httpAction(async () => {
        return new Response(JSON.stringify({ status: "ok" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }),
});

export default http;
