import { describe, expect, it } from 'vitest';

import {
  DEFAULT_FILE_LIMITS,
  MB,
  acceptFor,
  checkBlob,
  checkFile,
  fileExtension,
  normalizeMime,
  sniffType,
} from './files.js';

/** B5: ტიპი შიგთავსით — სერვერის, mock-ის და UI-ის საერთო წესი. */

const bytes = (/** @type {string | number[]} */ value) =>
  typeof value === 'string' ? new TextEncoder().encode(value) : Uint8Array.from(value);

const JPEG = bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]);
const PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
const WEBP = bytes('RIFF\x24\0\0\0WEBPVP8 ');
const PDF = bytes('%PDF-1.7\n%');

describe('sniffType', () => {
  it.each([
    ['JPEG', JPEG, 'image/jpeg'],
    ['PNG', PNG, 'image/png'],
    ['WebP', WEBP, 'image/webp'],
    ['PDF', PDF, 'application/pdf'],
    ['VTT', bytes('WEBVTT\n\n00:'), 'text/vtt'],
    ['VTT BOM-ით', bytes('\uFEFFWEBVTT - სათაური\n'), 'text/vtt'],
    ['VTT მხოლოდ თავსართი', bytes('WEBVTT'), 'text/vtt'],
    ['WEBVTTX — არა', bytes('WEBVTTX\n'), null],
    ['SVG', bytes('<svg xmlns="http://www.w3.org/2000/svg"/>'), null],
    ['XML + SVG', bytes('<?xml version="1.0"?><svg/>'), null],
    ['GIF', bytes('GIF89a'), null],
    ['HEIC / MP4 (ftyp)', bytes('\0\0\0\x18ftypheic'), null],
    ['HTML', bytes('<!doctype html>'), null],
    ['ZIP / DOCX', bytes('PK\x03\x04'), null],
    ['RIFF WAVE', bytes('RIFF\x24\0\0\0WAVEfmt '), null],
    ['%PDF დეფისის გარეშე', bytes('%PDF'), null],
    ['ცარიელი', bytes(''), null],
  ])('%s', (_name, head, expected) => {
    expect(sniffType(head)).toBe(expected);
  });
});

describe('checkFile', () => {
  /** @param {Partial<{ name: string, type: string, size: number, head: Uint8Array }>} file */
  const check = (file, options) =>
    checkFile({ name: 'a', type: '', size: 100, head: JPEG, ...file }, options);

  it('სწორი: შიგთავსი + გაფართოება + გამოცხადებული ტიპი (სინონიმიც)', () => {
    expect(check({ name: 'photo.JPG', type: 'image/jpeg' })).toEqual({
      ok: true,
      mime: 'image/jpeg',
      kind: 'image',
    });
    expect(check({ name: 'photo.jpeg', type: 'image/jpg' }).ok).toBe(true);
    expect(check({ name: 'scan', type: 'application/octet-stream' }).ok).toBe(true);
    expect(check({ name: 'ka.vtt', type: 'text/plain', head: bytes('WEBVTT\n') }).ok).toBe(true);
  });

  it('გაფართოება ან გამოცხადებული MIME ≠ შიგთავსი → fileMismatch', () => {
    expect(check({ name: 'photo.png' })).toEqual({ ok: false, code: 'fileMismatch' });
    expect(check({ name: 'x', type: 'application/pdf' }).ok).toBe(false);
    expect(check({ name: 'r.jpg', head: PDF })).toEqual({ ok: false, code: 'fileMismatch' });
    expect(check({ name: 'ka.txt', head: bytes('WEBVTT\n') }).code).toBe('fileMismatch');
  });

  it('უცნობი ტიპი ან სხვა სახე → fileType; ცარიელი → fileEmpty', () => {
    expect(check({ name: 'a.svg', head: bytes('<svg/>') })).toEqual({
      ok: false,
      code: 'fileType',
    });
    expect(check({ name: 'a.pdf', head: PDF }, { kinds: ['image'] }).code).toBe('fileType');
    expect(check({ size: 0 })).toEqual({ ok: false, code: 'fileEmpty' });
  });

  it('ზომა სახის ზღვრით → fileTooLarge + max', () => {
    expect(check({ size: DEFAULT_FILE_LIMITS.image + 1 })).toEqual({
      ok: false,
      code: 'fileTooLarge',
      max: 10 * MB,
    });
    expect(check({ name: 'r.pdf', head: PDF, size: 15 * MB }).ok).toBe(true);
    expect(
      check({ size: 3 * MB }, { limits: { image: 2 * MB, document: MB, track: MB } }).max,
    ).toBe(2 * MB);
  });
});

describe('დამხმარე', () => {
  it('fileExtension / normalizeMime / acceptFor', () => {
    expect(fileExtension('ფოტო.Final.JPG')).toBe('jpg');
    expect(fileExtension('noext')).toBe('');
    expect(normalizeMime(' Image/JPG; charset=binary')).toBe('image/jpeg');
    expect(acceptFor(['image'])).toBe('image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp');
    expect(acceptFor(['document'])).toBe('application/pdf,.pdf');
  });

  it('checkBlob — ბრაუზერის File (პირველი ბაიტები)', async () => {
    const svg = new File(['<svg onload="alert(1)"/>'], 'logo.png', { type: 'image/png' });
    expect(await checkBlob(svg)).toEqual({ ok: false, code: 'fileType' });
    const pdf = new File([PDF], 'r.pdf', { type: 'application/pdf' });
    expect(await checkBlob(pdf, { kinds: ['document'] })).toMatchObject({
      ok: true,
      kind: 'document',
    });
  });
});
