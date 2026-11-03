import { describe, expect, test } from 'bun:test';
import express from 'express';
import { loadConfig } from './config';

const trustProxyOf = (value: string | undefined) => loadConfig({ TRUST_PROXY: value }).TRUST_PROXY;

describe('TRUST_PROXY', () => {
  test('defaults to loopback proxies', () => {
    expect(trustProxyOf(undefined)).toBe('loopback');
  });

  test('parses true and false as booleans', () => {
    expect(trustProxyOf('true')).toBe(true);
    expect(trustProxyOf('false')).toBe(false);
  });

  test('parses a non-negative hop count as a number', () => {
    expect(trustProxyOf('0')).toBe(0);
    expect(trustProxyOf('1')).toBe(1);
    expect(trustProxyOf('2')).toBe(2);
  });

  test('keeps a list of IPs, CIDRs and named subnets as a normalized string', () => {
    expect(trustProxyOf('uniquelocal')).toBe('uniquelocal');
    expect(trustProxyOf(' loopback, 172.16.0.0/12 ,10.0.0.1, fd00::/8,::1 ')).toBe(
      'loopback,172.16.0.0/12,10.0.0.1,fd00::/8,::1',
    );
  });

  test.each([
    '',
    ' ',
    'yes',
    '-1',
    '1.5',
    '10.0.0.0/33',
    '::/129',
    '10.0.0.0/255.0.0.0',
    'proxy.local',
    '10.0.0.1,,10.0.0.2',
  ])('rejects %p', (value) => {
    expect(() => trustProxyOf(value)).toThrow();
  });

  test.each([
    'loopback',
    'true',
    'false',
    '0',
    '3',
    'linklocal, uniquelocal',
    '192.168.1.10, 172.16.0.0/12, ::1, fe80::/10',
  ])('Express accepts the parsed value of %p', (value) => {
    expect(() => express().set('trust proxy', trustProxyOf(value))).not.toThrow();
  });
});

describe('BRAPI_TOKEN', () => {
  test('is optional', () => {
    expect(loadConfig({}).BRAPI_TOKEN).toBeUndefined();
  });

  test.each(['', '   '])('treats %p as unset, as Docker Compose passes an unset variable', (value) => {
    expect(loadConfig({ BRAPI_TOKEN: value }).BRAPI_TOKEN).toBeUndefined();
  });

  test('keeps a real token, trimmed', () => {
    expect(loadConfig({ BRAPI_TOKEN: ' abc ' }).BRAPI_TOKEN).toBe('abc');
  });
});
