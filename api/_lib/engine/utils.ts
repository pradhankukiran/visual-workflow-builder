import { randomUUID } from 'crypto';

// M10: Block prototype pollution paths
const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Dot-path traversal replacing lodash-es `get()`.
 * Supports `a.b.c` and `a[0].b` syntax.
 */
export function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  if (obj === null || obj === undefined) return undefined;

  // Normalize bracket notation: `a[0].b` → `a.0.b`
  const normalized = path.replace(/\[(\d+)\]/g, '.$1');
  const keys = normalized.split('.');

  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    if (BLOCKED_KEYS.has(key)) return undefined;
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Generate a prefixed unique ID using crypto.randomUUID().
 */
export function generateId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 21)}`;
}

/**
 * Current timestamp as ISO 8601 string.
 */
export function now(): string {
  return new Date().toISOString();
}
