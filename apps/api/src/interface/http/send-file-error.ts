const CLIENT_ABORTED_CODE = 'ECONNABORTED';
const WRITE_SYSCALL = 'write';

function property(err: unknown, name: string): unknown {
  return typeof err === 'object' && err !== null ? (err as Record<string, unknown>)[name] : undefined;
}

/**
 * Whether an error reported by `res.sendFile` is a fault of the server (a missing or unreadable file)
 * rather than the client going away. Mirrors what Express's own default skips: `send` reports
 * ECONNABORTED when the client leaves while the file is still being stat-ed, before any header is
 * written, and a write error means the connection is already closed.
 */
export function isServerFault(err: unknown): boolean {
  if (!err) return false;
  return property(err, 'code') !== CLIENT_ABORTED_CODE && property(err, 'syscall') !== WRITE_SYSCALL;
}
