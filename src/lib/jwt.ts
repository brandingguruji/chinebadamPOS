import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'chinebadam-secret');
const ALG = 'HS256';

export interface TokenPayload extends JWTPayload {
  userId: string;
  username: string;
  role: string;
}

export async function signToken(payload: Omit<TokenPayload, keyof JWTPayload>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, SECRET);
  return payload as TokenPayload;
}
