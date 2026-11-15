import { describe, expect, test } from 'bun:test';
import { isServerFault } from './send-file-error';

const errorWith = (props: Record<string, unknown>) => Object.assign(new Error('send'), props);

describe('isServerFault', () => {
  test('is false without an error', () => {
    expect(isServerFault(null)).toBe(false);
    expect(isServerFault(undefined)).toBe(false);
  });

  test('is false when the client went away before any header was written', () => {
    expect(isServerFault(errorWith({ code: 'ECONNABORTED' }))).toBe(false);
  });

  test('is false for a write error on a closed connection', () => {
    expect(isServerFault(errorWith({ code: 'EPIPE', syscall: 'write' }))).toBe(false);
  });

  test.each([
    ['a missing file reported by send', errorWith({ status: 404, code: 'ENOENT' })],
    ['an unreadable file', errorWith({ code: 'EACCES', syscall: 'open' })],
    ['a directory in place of the file', errorWith({ code: 'EISDIR' })],
    ['an error that is not an Error', 'boom'],
  ])('is true for %s', (_name, err) => {
    expect(isServerFault(err)).toBe(true);
  });
});
