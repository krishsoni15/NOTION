/**
 * Convex HTTP Router
 * Serves OIDC discovery and JWKS endpoints for custom JWT verification
 * 
 * IMPORTANT: The JWKS public key is read from the Convex environment variable
 * JWT_PUBLIC_JWK. Set it via: npx convex env set JWT_PUBLIC_JWK '<json>'
 * This ensures each deployment has the correct key without hardcoding.
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// OIDC Discovery endpoint
http.route({
    path: "/.well-known/openid-configuration",
    method: "GET",
    handler: httpAction(async (_ctx, request) => {
        const url = new URL(request.url);
        const baseUrl = `${url.protocol}//${url.host}`;

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
                "Cache-Control": "public, max-age=86400",
            },
        });
    }),
});

// JWKS endpoint - serves the public key for JWT verification
// Reads from Convex env var JWT_PUBLIC_JWK (set via `npx convex env set`)
http.route({
    path: "/.well-known/jwks.json",
    method: "GET",
    handler: httpAction(async () => {
        const pubKeyJson = process.env.JWT_PUBLIC_JWK;

        if (pubKeyJson) {
            // Dynamic: read from Convex environment variable
            try {
                const jwk = JSON.parse(pubKeyJson);
                // Ensure required fields
                if (!jwk.alg) jwk.alg = "RS256";
                if (!jwk.use) jwk.use = "sig";

                const jwks = { keys: [jwk] };
                return new Response(JSON.stringify(jwks), {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                        "Cache-Control": "public, max-age=3600",
                    },
                });
            } catch (e) {
                console.error("Failed to parse JWT_PUBLIC_JWK:", e);
            }
        }

        // Fallback: return empty keys (will cause auth to fail gracefully)
        console.error("JWT_PUBLIC_JWK environment variable not set! Run: npx convex env set JWT_PUBLIC_JWK '<json>'");
        return new Response(JSON.stringify({ keys: [] }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        });
    }),
});

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
