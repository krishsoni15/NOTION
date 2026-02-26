/**
 * JWT Utilities - Custom Auth
 * Sign and verify JWT tokens using RSA256
 */
import { importJWK, SignJWT, jwtVerify, type JWK } from "jose";

const JWT_AUDIENCE = "convex";

function getIssuer(): string {
    return process.env.CONVEX_SITE_URL || "https://notion-auth.local";
}

async function getPrivateKey() {
    const b64 = process.env.JWT_PRIVATE_KEY;
    if (!b64) throw new Error("JWT_PRIVATE_KEY not set");
    const jwk: JWK = JSON.parse(Buffer.from(b64, "base64").toString());
    return importJWK(jwk, "RS256");
}

async function getPublicKey() {
    const b64 = process.env.JWT_PUBLIC_KEY;
    if (!b64) throw new Error("JWT_PUBLIC_KEY not set");
    const jwk: JWK = JSON.parse(Buffer.from(b64, "base64").toString());
    return importJWK(jwk, "RS256");
}

export function getPublicJWK(): JWK {
    const b64 = process.env.JWT_PUBLIC_KEY;
    if (!b64) throw new Error("JWT_PUBLIC_KEY not set");
    return JSON.parse(Buffer.from(b64, "base64").toString());
}

export interface TokenPayload {
    userId: string;
    username: string;
    name: string;
    role: string;
}

export async function signToken(payload: TokenPayload): Promise<string> {
    const key = await getPrivateKey();
    return new SignJWT({
        name: payload.name,
        nickname: payload.username,
        role: payload.role,
    })
        .setProtectedHeader({ alg: "RS256", kid: "notion-1" })
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
    } catch {
        return null;
    }
}
