import { createPublicKey, timingSafeEqual, verify } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { AppEnv } from "../config/env.js";

export interface AuthenticatedRequest extends Request {
  auth?: {
    provider: "clerk";
    subject: string;
    claims: ClerkJwtClaims;
  };
}

interface ClerkJwtClaims {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  email?: string;
  name?: string;
  [key: string]: unknown;
}

interface Jwk {
  kid?: string;
  kty: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
}

interface JwksResponse {
  keys: Jwk[];
}

const jwksCache = new Map<string, { expiresAt: number; keys: Jwk[] }>();
const jwksCacheMs = 5 * 60 * 1000;

export function createClerkAuthMiddleware(env: AppEnv) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const issuer = env.CLERK_JWT_ISSUER;
    if (!issuer) {
      res.status(503).json({ error: "Clerk JWT issuer is not configured" });
      return;
    }

    const token = bearerToken(req);
    if (!token) {
      res.status(401).json({ error: "Missing bearer token" });
      return;
    }

    try {
      const claims = await verifyClerkJwt(token, {
        issuer,
        audience: env.CLERK_JWT_AUDIENCE
      });
      if (!claims.sub) {
        res.status(401).json({ error: "Invalid Clerk token subject" });
        return;
      }
      req.auth = {
        provider: "clerk",
        subject: claims.sub,
        claims
      };
      next();
    } catch {
      res.status(401).json({ error: "Invalid bearer token" });
    }
  };
}

async function verifyClerkJwt(
  token: string,
  options: { issuer: string; audience?: string }
): Promise<ClerkJwtClaims> {
  const [headerSegment, payloadSegment, signatureSegment] = token.split(".");
  if (!headerSegment || !payloadSegment || !signatureSegment) {
    throw new Error("Malformed JWT");
  }

  const header = parseJsonSegment<{ alg?: string; kid?: string }>(headerSegment);
  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Unsupported JWT header");
  }

  const claims = parseJsonSegment<ClerkJwtClaims>(payloadSegment);
  validateClaims(claims, options);

  const jwk = (await getJwks(options.issuer)).find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Unknown JWT key");

  const key = createPublicKey({
    key: jwk,
    format: "jwk"
  } as Parameters<typeof createPublicKey>[0]);
  const input = Buffer.from(`${headerSegment}.${payloadSegment}`);
  const signature = base64UrlDecode(signatureSegment);
  const ok = verify("RSA-SHA256", input, key, signature);
  if (!ok) throw new Error("Invalid JWT signature");

  return claims;
}

function validateClaims(
  claims: ClerkJwtClaims,
  options: { issuer: string; audience?: string }
): void {
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== options.issuer) throw new Error("Invalid issuer");
  if (!claims.sub) throw new Error("Missing subject");
  if (claims.exp !== undefined && claims.exp <= now) throw new Error("Expired token");
  if (claims.nbf !== undefined && claims.nbf > now) throw new Error("Token not active");
  if (!options.audience) return;

  const audiences = Array.isArray(claims.aud)
    ? claims.aud
    : claims.aud
      ? [claims.aud]
      : [];
  const expected = Buffer.from(options.audience);
  const matches = audiences.some((audience) => {
    const actual = Buffer.from(audience);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
  if (!matches) throw new Error("Invalid audience");
}

async function getJwks(issuer: string): Promise<Jwk[]> {
  const cached = jwksCache.get(issuer);
  if (cached && cached.expiresAt > Date.now()) return cached.keys;

  const url = new URL("/.well-known/jwks.json", issuer);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Unable to fetch Clerk JWKS");
  const body = (await response.json()) as JwksResponse;
  jwksCache.set(issuer, {
    expiresAt: Date.now() + jwksCacheMs,
    keys: body.keys
  });
  return body.keys;
}

function bearerToken(req: Request): string | undefined {
  const header = req.header("authorization");
  if (!header) return undefined;
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : undefined;
}

function parseJsonSegment<T>(segment: string): T {
  return JSON.parse(base64UrlDecode(segment).toString("utf8")) as T;
}

function base64UrlDecode(value: string): Buffer {
  return Buffer.from(value.replaceAll("-", "+").replaceAll("_", "/"), "base64");
}
