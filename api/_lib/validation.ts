/**
 * Shared ID validation for all API routes.
 *
 * IDs must be pre-validated at the route level before being interpolated
 * into Redis keys.
 */

/** Safe pattern for workflow/execution IDs: alphanumeric, hyphens, underscores, 1-64 chars. */
export const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

/** Check whether a string is a safe ID for use in Redis keys. */
export function isValidId(id: string): boolean {
  return SAFE_ID_PATTERN.test(id);
}
