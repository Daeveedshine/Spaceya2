import type { IncomingMessage } from 'http';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from './firebase';

/** Minimal request/response shapes shared by Vercel functions and Express. */
export interface Req extends IncomingMessage {
  body?: any;
  method?: string;
}
export interface Res {
  status(code: number): Res;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Reads the unparsed request body (needed for webhook signature checks). */
export const readRawBody = async (req: Req): Promise<Buffer> => {
  if (Buffer.isBuffer(req.body)) return req.body; // express.raw()
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
};

/** Verifies the Firebase ID token in `Authorization: Bearer <token>`. */
export const requireUser = async (req: Req): Promise<{ uid: string }> => {
  const header = String(req.headers['authorization'] || '');
  const match = header.match(/^Bearer (.+)$/);
  if (!match) throw new HttpError(401, 'Missing auth token');
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(match[1]);
    return { uid: decoded.uid };
  } catch {
    throw new HttpError(401, 'Invalid auth token');
  }
};

/** Wraps a handler: POST only, JSON errors, no stack traces or internals leaked. */
export const route =
  (handler: (req: Req) => Promise<unknown>) =>
  async (req: Req, res: Res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      const result = await handler(req);
      return res.status(200).json(result ?? { ok: true });
    } catch (err) {
      if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
      console.error('Unhandled API error:', err);
      return res.status(500).json({ error: 'Internal error' });
    }
  };
