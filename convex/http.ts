/**
 * Convex HTTP Router
 * Serves OIDC discovery and JWKS endpoints for custom JWT verification
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
http.route({
    path: "/.well-known/jwks.json",
    method: "GET",
    handler: httpAction(async () => {
        // Public key JWK - this is PUBLIC and safe to expose
        const jwks = {
            keys: [
                {
                    kty: "RSA",
                    n: "xmkM-tbV6dF23Jc42kepYLgiTDiDSgyv2J2qUYH1Sulhs7lmgLw8V8wms_McFU5Ou1yPRmnqoD6YZwYF0EseCOmzxUS1I-WG8DpoZKRkBtYNPrPi5IWHFoS9jbYc6Q_7C_T62x0COmAUcTSkUsMmfpe7mazYqyWgKJIXTLLOGKHllZE4Mlqmnwb-9h98KY_6gDcVSS5-gfzX0aRWHCaRGHyoP1meem9giB5aEJUpG1YoexXBDxZk4di3AOwPR6HK8EUuk6AOzXOf1LH6THxtih83zbqEoBmG0eKeq6TZ-g4Mn_MrJ89NC-96UBfTKhqrz16EhFtZIlfvuOywx6k93Q",
                    e: "AQAB",
                    kid: "notion-1",
                    alg: "RS256",
                    use: "sig",
                },
            ],
        };

        return new Response(JSON.stringify(jwks), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=86400",
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
