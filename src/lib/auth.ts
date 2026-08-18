import jwksClient from "jwks-rsa";
import jwt from "jsonwebtoken";
import express from "express";

const jwksUri = process.env.AUTH_JWKS_URI;
const issuer = process.env.AUTH_ISSUER;
const audience = process.env.AUTH_AUDIENCE;

if (!jwksUri && !process.env.AUTH_PUBLIC_KEY) {
  // It's valid to run without auth configured (dev). We just warn.
  // When AUTH_JWKS_URI or AUTH_PUBLIC_KEY is provided, the middleware will validate tokens.
  // eslint-disable-next-line no-console
  console.warn("Auth not configured: set AUTH_JWKS_URI or AUTH_PUBLIC_KEY to enable JWT validation.");
}

const client = jwksUri
  ? jwksClient({ jwksUri, cache: true, rateLimit: true })
  : null;

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  if (!client) return callback(new Error("No JWKS client configured"));
  if (!header.kid) return callback(new Error("No kid in token header"));
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err as Error);
    if (!key) return callback(new Error("Signing key not found"));
    // jwks-rsa returns a key object with helper methods; access public key safely
    const anyKey: any = key;
    const pub = typeof anyKey.getPublicKey === "function" ? anyKey.getPublicKey() : anyKey.publicKey || anyKey.rsaPublicKey;
    if (!pub) return callback(new Error("Public key not available on JWKS key"));
    callback(null, pub);
  });
}

export interface AuthRequest extends express.Request {
  auth?: { sub?: string; roles?: string[]; [k: string]: any };
}

export function jwtMiddleware(requiredRoles?: string[]) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const aReq = req as AuthRequest;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }
    const token = authHeader.split(" ")[1];

    try {
      if (process.env.AUTH_PUBLIC_KEY) {
        const pub = process.env.AUTH_PUBLIC_KEY.replace(/\\n/g, "\n");
        const decoded = jwt.verify(token, pub, { audience, issuer }) as any;
        aReq.auth = decoded;
      } else if (client) {
        const decoded = jwt.verify(token, getKey as any, { audience, issuer }) as any;
        aReq.auth = decoded;
      } else {
        // Auth not configured: allow through but set minimal auth info
        aReq.auth = { sub: "anonymous", roles: ["anonymous"] };
      }

      if (requiredRoles && requiredRoles.length > 0) {
        const roles: string[] = (aReq.auth && (aReq.auth.roles || aReq.auth.role || aReq.auth.roles)) || [];
        const has = requiredRoles.some((r) => roles.includes(r));
        if (!has) return res.status(403).json({ error: "Insufficient role" });
      }

      return next();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("JWT validation failed", err?.message || err);
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}

export default jwtMiddleware;
