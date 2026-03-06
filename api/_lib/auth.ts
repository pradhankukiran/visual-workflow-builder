import { verifyToken } from '@clerk/backend';
import type { VercelRequest } from '@vercel/node';

export interface AuthResult {
  userId: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function authenticate(req: VercelRequest): Promise<AuthResult> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid authorization header');
  }

  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error('CLERK_SECRET_KEY environment variable is not set');
  }

  const token = authHeader.slice(7);
  let payload: Awaited<ReturnType<typeof verifyToken>>;
  try {
    const verifyOpts: Parameters<typeof verifyToken>[1] = {
      secretKey: process.env.CLERK_SECRET_KEY,
    };
    if (process.env.CLERK_AUTHORIZED_PARTIES) {
      verifyOpts.authorizedParties = process.env.CLERK_AUTHORIZED_PARTIES.split(',');
    }
    payload = await verifyToken(token, verifyOpts);
  } catch {
    throw new AuthError('Token verification failed');
  }
  if (!payload.sub) {
    throw new AuthError('Invalid token: no subject');
  }
  return { userId: payload.sub };
}
