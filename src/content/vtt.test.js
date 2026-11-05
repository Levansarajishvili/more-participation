import { describe, expect, it } from 'vitest';

import { cueAt, parseCaptions, parseCueTime, parseVtt, summarizeCues } from './vtt.js';

const VALID = `WEBVTT - ქართული

NOTE მთარგმნელის შენიშვნა

1
00:00:01.000 --> 00:00:04.000 align:center
<v [სახელი]>[პირველი ფრაზა]</v>

00:00:03.500 --> 00:00:06.000
[მეორე, გადაფარული]
[მეორე სტრიქონი]

01:02.000 --> 01:05.250
<c.yellow>[მესამე]</c> &amp; [ბოლო]
`;

describe('F10: parseCaptions — მკაცრი WebVTT', () => {
  it('სწორი ფაილი: იდენტიფიკატორი, პარამეტრები, გადაფარვა, mm:ss, ტეგები, NOTE', () => {
    const result = parseCaptions(`\uFEFF${VALID.replace(/\n/g, '\r\n')}`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.cues).toEqual([
      { start: 1, end: 4, text: '[პირველი ფრაზა]', speaker: '[სახელი]', line: 6 },
      { start: 3.5, end: 6, text: '[მეორე, გადაფარული]\n[მეორე სტრიქონი]', line: 9 },
      { start: 62, end: 65.25, text: '[მესამე] & [ბოლო]', line: 13 },
    ]);
    expect(summarizeCues(result.cues)).toEqual({ cues: 3, end: 65.25 });
  });

  it.each([
    ['თავსართის გარეშე', '00:00:01.000 --> 00:00:02.000\nა', 'header', 1],
    ['თავსართი სხვა სიტყვით', 'WEBVTTX\n\n00:00:01.000 --> 00:00:02.000\nა', 'header', 1],
    ['დრო მძიმით (SRT)', 'WEBVTT\n\n00:00:01,000 --> 00:00:02,000\nა', 'timing', 3],
    ['წამი ≥ 60', 'WEBVTT\n\n00:00:61.000 --> 00:01:02.000\nა', 'timing', 3],
    ['დასრულება დაწყებამდე', 'WEBVTT\n\n00:00:05.000 --> 00:00:02.000\nა', 'timing', 3],
    ['ისრის გარეშე ბლოკი', 'WEBVTT\n\nid\nტექსტი\n', 'timing', 4],
    [
      'დაულაგებელი',
      'WEBVTT\n\n00:00:05.000 --> 00:00:06.000\nა\n\n00:00:01.000 --> 00:00:02.000\nბ',
      'order',
      6,
    ],
    ['ცარიელი', 'WEBVTT\n\n', 'empty', 3],
  ])('დაზიანებული: %s → %s, სტრიქონი %i', (_name, text, code, line) => {
    expect(parseCaptions(text)).toEqual({ ok: false, code, line });
  });

  it('parseCueTime: hh:mm:ss.ttt და mm:ss.ttt; სხვა ფორმა — NaN', () => {
    expect(parseCueTime('01:00:00.500')).toBe(3600.5);
    expect(parseCueTime('00:01.000')).toBe(1);
    expect(parseCueTime('1:00.000')).toBeNaN();
    expect(parseCueTime('00:00:01')).toBeNaN();
  });
});

describe('F10: cueAt — მიმდინარე სუბტიტრი', () => {
  const result = parseCaptions(VALID);
  const cues = result.ok ? result.cues : [];
  it.each([
    [0.5, ''],
    [1, '[პირველი ფრაზა]'],
    [3.75, '[პირველი ფრაზა]\n[მეორე, გადაფარული]\n[მეორე სტრიქონი]'],
    [4, '[მეორე, გადაფარული]\n[მეორე სტრიქონი]'],
    [30, ''],
    [65.2, '[მესამე] & [ბოლო]'],
    [65.25, ''],
    [Number.NaN, ''],
  ])('%s წმ → %j', (time, text) => {
    expect(cueAt(cues, time)).toBe(text);
  });
});

describe('ტრანსკრიპტის იმპორტი (თავისუფალი რეჟიმი)', () => {
  it('cue → სტრიქონი, სპიკერი <v>-დან', () => {
    expect(parseVtt(VALID)).toEqual([
      { start: 1, kind: 'speech', text: '[პირველი ფრაზა]', speaker: '[სახელი]' },
      { start: 3.5, kind: 'speech', text: '[მეორე, გადაფარული] [მეორე სტრიქონი]' },
      { start: 62, kind: 'speech', text: '[მესამე] &amp; [ბოლო]' },
    ]);
  });
});
