/**
 * JWT Utilities - Custom Auth
 * Sign and verify JWT tokens using RSA256
 * 
 * Reads kid dynamically from the key itself so it works
 * regardless of which key pair is in .env.local
 */
import { importJWK, SignJWT, jwtVerify, type JWK } from "jose";

const JWT_AUDIENCE = "convex";

function getIssuer(): string {
    // Derive issuer from NEXT_PUBLIC_CONVEX_URL (.cloud -> .site)
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (url) {
        return url.replace(".cloud", ".site");
    }
    return process.env.CONVEX_SITE_URL || "https://notion-auth.local";
}

function getPrivateJWK(): JWK {
    const b64 = process.env.JWT_PRIVATE_KEY;
    if (!b64) throw new Error("JWT_PRIVATE_KEY not set");
    const jsonStr = typeof Buffer !== "undefined"
        ? Buffer.from(b64, "base64").toString("utf8")
        : atob(b64);
    return JSON.parse(jsonStr);
}

function getPublicJWK_internal(): JWK {
    const b64 = process.env.JWT_PUBLIC_KEY;
    if (!b64) throw new Error("JWT_PUBLIC_KEY not set");
    const jsonStr = typeof Buffer !== "undefined"
        ? Buffer.from(b64, "base64").toString("utf8")
        : atob(b64);
    return JSON.parse(jsonStr);
}

async function getPrivateKey() {
    const jwk = getPrivateJWK();
    return importJWK(jwk, "RS256");
}

async function getPublicKey() {
    const jwk = getPublicJWK_internal();
    return importJWK(jwk, "RS256");
}

export function getPublicJWK(): JWK {
    return getPublicJWK_internal();
}

export interface TokenPayload {
    userId: string;
    username: string;
    name: string;
    role: string;
}

export async function signToken(payload: TokenPayload): Promise<string> {
    const privateJwk = getPrivateJWK();
    const kid = privateJwk.kid || "notion-client-1";
    const key = await importJWK(privateJwk, "RS256");

    return new SignJWT({
        name: payload.name,
        nickname: payload.username,
        role: payload.role,
    })
        .setProtectedHeader({ alg: "RS256", kid })
        .setIssuer(getIssuer())
        .setSubject(payload.userId)
        .setAudience(JWT_AUDIENCE)
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(key);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
    try {
        const key = await getPublicKey();
        const { payload } = await jwtVerify(token, key, {
            issuer: getIssuer(),
            audience: JWT_AUDIENCE,
        });
        return {
            userId: payload.sub!,
            username: (payload.nickname as string) || "",
            name: (payload.name as string) || "",
            role: (payload.role as string) || "",
        };
    } catch (error) {
        console.error("JWT Verify Error:", error);
        return null;
    }
}
