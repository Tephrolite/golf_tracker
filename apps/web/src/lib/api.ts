import { errorResponseSchema, meResponseSchema, profileBootstrapResponseSchema, type MeResponse, type ProfileBootstrapInput } from '@golf-track/shared';
import { environment } from './env';

export class ApiError extends Error { constructor(public readonly status: number, public readonly code: string, message: string) { super(message); } }
async function request(path: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(`${environment.VITE_API_BASE_URL}${path}`, { ...init, headers: { ...init?.headers, authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' } });
  if (!response.ok) { const body = errorResponseSchema.safeParse(await response.json()); throw new ApiError(response.status, body.success ? body.data.error.code : 'API_ERROR', body.success ? body.data.error.message : 'The API request failed.'); }
  return response;
}
export async function getMe(accessToken: string): Promise<MeResponse> {
  const response = await request('/me', accessToken);
  return meResponseSchema.parse(await response.json());
}
export async function bootstrapProfile(accessToken: string, input: ProfileBootstrapInput) {
  const response = await request('/profile/bootstrap', accessToken, { method: 'POST', body: JSON.stringify(input) });
  return profileBootstrapResponseSchema.parse(await response.json()).profile;
}