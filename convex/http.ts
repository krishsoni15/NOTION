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
                    n: "5kB57Pnd4TIssxVNIkG-sIY8g-RQRo1BSqu43tdnDlKsSbdWAN_w2b8M9lnlVxioUTUYKhSl4H_j-iGH9ZQmltZvisAkeYOyvrWdPwTxqjCgKnXXuAci7jb3slwSDz_MobYkkxItey0d_N1SUItQzn3y9Y9syQTXuLbe_PVZ67RJigpUT7pLebVADzyUbARmUQfeMDSkVce70FCXQ4Vt1FWlLaAFP0YHvwsn5OY84NUxxvL8VhepzALTCsKp5EYbJWCoFepuuZcJpfIEcakCfzUEZstp3V1OmKuBHz_bAXHpATJZkPdzD__aSQOVQVEFw-enjb1lGJhmxiz2y5-4FQ",
                    e: "AQAB",
                    kid: "notion-client-1",
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
