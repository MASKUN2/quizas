import type { ConfigService } from '@nestjs/config';

/**
 * Non-throwing check: does this Authorization header carry the admin token?
 * Used by read endpoints that stay public but reveal drafts to the admin.
 */
export function isAdminToken(
  authHeader: string | undefined,
  config: ConfigService,
): boolean {
  const expected = config.get<string>('ADMIN_TOKEN');
  return !!expected && authHeader === `Bearer ${expected}`;
}
