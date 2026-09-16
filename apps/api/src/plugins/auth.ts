import fp from 'fastify-plugin';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import type { WebSocketLikeConstructor } from '@supabase/realtime-js';
import type { Environment } from '../config/env.js';

export interface AuthenticatedIdentity {
  subject: string;
  email: string | null;
}
export interface AuthVerifier {
  verify(accessToken: string): Promise<AuthenticatedIdentity | null>;
}

class SupabaseWebSocket extends WebSocket {
  constructor(address: string | URL, subprotocols?: string | string[]) {
    super(address, subprotocols);
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    identity: AuthenticatedIdentity | null;
  }
}

export function createSupabaseAuthVerifier(environment: Environment): AuthVerifier {
  const supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: SupabaseWebSocket as unknown as WebSocketLikeConstructor },
  });
  return {
    async verify(accessToken) {
      const { data, error } = await supabase.auth.getUser(accessToken);
      if (error || !data.user) return null;
      return { subject: data.user.id, email: data.user.email ?? null };
    },
  };
}

export const authenticationPlugin = fp(async (app, verifier: AuthVerifier) => {
  app.addHook('onRequest', async (request) => {
    const authorization = request.headers.authorization;
    const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    request.identity = accessToken ? await verifier.verify(accessToken) : null;
  });
});
