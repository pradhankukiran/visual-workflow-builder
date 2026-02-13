/**
 * Shared SSRF validation for all API routes that make outbound HTTP requests.
 *
 * Blocks non-HTTP schemes, localhost, private IPv4/IPv6, cloud metadata
 * endpoints, and validates redirect targets.
 */

const CLOUD_METADATA_HOSTS = new Set([
  '169.254.169.254',
  'metadata.google.internal',
]);

/**
 * Check whether a URL points to a private/internal address that should
 * not be reachable from server-side code.
 */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Block non-HTTP schemes
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return true;
    }

    const hostname = url.hostname;

    // Block cloud metadata endpoints
    if (CLOUD_METADATA_HOSTS.has(hostname)) {
      return true;
    }

    // Block localhost variants
    if (
      hostname === 'localhost' ||
      hostname === '0.0.0.0' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname === '::1'
    ) {
      return true;
    }

    // Block IPv6 private ranges
    if (hostname.startsWith('[')) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();
      if (
        ipv6 === '::1' ||
        ipv6.startsWith('fc') || ipv6.startsWith('fd') || // fc00::/7 (unique local)
        ipv6.startsWith('fe80') || // fe80::/10 (link-local)
        ipv6.startsWith('::ffff:') // ::ffff: mapped IPv4
      ) {
        return true;
      }
    }

    // Block private IPv4 ranges
    const parts = hostname.split('.').map(Number);
    if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
      const [a, b] = parts;
      if (a === 127) return true; // 127.0.0.0/8
      if (a === 10) return true; // 10.0.0.0/8
      if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
      if (a === 192 && b === 168) return true; // 192.168.0.0/16
      if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local)
      if (a === 0) return true; // 0.0.0.0/8
    }

    return false;
  } catch {
    // Unparseable URLs are blocked
    return true;
  }
}

/**
 * Validate a redirect Location header. Resolves relative redirects
 * against the original URL, then checks with `isPrivateUrl`.
 */
export function isPrivateRedirectTarget(location: string, originalUrl: string): boolean {
  try {
    // Resolve relative URLs against the original
    const resolved = new URL(location, originalUrl).toString();
    return isPrivateUrl(resolved);
  } catch {
    return true;
  }
}
