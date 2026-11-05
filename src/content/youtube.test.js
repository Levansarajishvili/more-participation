import { describe, expect, it } from 'vitest';

import {
  YOUTUBE_CSP,
  isPlaceholder,
  isYouTubeId,
  parseYouTube,
  youtubeEmbedUrl,
  youtubePoster,
  youtubeThumbnail,
} from './youtube.js';

/** YouTube-ის დოკუმენტაციის სადემონსტრაციო id (IFrame API-ის მაგალითი) — მხოლოდ ტესტში. */
const ID = 'M7lc1UVf-VE';

describe('F10: parseYouTube — ბმული → id', () => {
  it.each([
    ['watch?v=', `https://www.youtube.com/watch?v=${ID}`],
    ['watch + t= + list=', `https://www.youtube.com/watch?v=${ID}&t=83s&list=PL0123456789`],
    ['watch, პარამეტრი v ბოლოს', `https://youtube.com/watch?feature=share&v=${ID}`],
    ['m.youtube.com', `https://m.youtube.com/watch?v=${ID}`],
    ['music.youtube.com', `https://music.youtube.com/watch?v=${ID}`],
    ['youtu.be', `https://youtu.be/${ID}`],
    ['youtu.be + si= + t=', `https://youtu.be/${ID}?si=AbCdEf123&t=42`],
    ['shorts', `https://www.youtube.com/shorts/${ID}`],
    ['embed', `https://www.youtube.com/embed/${ID}?start=10`],
    ['live', `https://www.youtube.com/live/${ID}?feature=share`],
    ['youtube-nocookie.com/embed', `https://www.youtube-nocookie.com/embed/${ID}?rel=0`],
    ['სქემის გარეშე', `youtube.com/watch?v=${ID}`],
    ['http', `http://youtu.be/${ID}`],
    ['გამოტოვებები გარშემო', `   https://youtu.be/${ID}  `],
    ['ჰოსტი დიდი ასოებით', `https://WWW.YouTube.com/watch?v=${ID}`],
    ['მხოლოდ id', ID],
  ])('%s', (_name, input) => {
    expect(parseYouTube(input)).toBe(ID);
  });

  it.each([
    ['ცარიელი', ''],
    ['სტრიქონი არ არის', /** @type {any} */ (null)],
    ['სხვა დომენი', `https://vimeo.com/${ID}`],
    ['მსგავსი დომენი', `https://youtube.com.evil.example/watch?v=${ID}`],
    ['ქვედომენი-ხაფანგი', `https://youtube.example.com/watch?v=${ID}`],
    ['javascript:', `javascript:alert('${ID}')`],
    ['მომხმარებელი URL-ში', `https://user:pass@youtube.com/watch?v=${ID}`],
    ['playlist id-ის გარეშე', 'https://www.youtube.com/playlist?list=PL0123456789'],
    ['არხი', 'https://www.youtube.com/@channel'],
    ['მოკლე id', 'https://youtu.be/abc123'],
    ['გრძელი id', `https://youtu.be/${ID}x`],
    ['აკრძალული სიმბოლო', 'https://youtu.be/M7lc1UVf=VE'],
    ['nocookie, embed-ის გარეშე', `https://www.youtube-nocookie.com/watch?v=${ID}`],
    ['watch, v-ის გარეშე', 'https://www.youtube.com/watch?t=10'],
    ['ტექსტი გამოტოვებით', `ნახე ეს https://youtu.be/${ID}`],
    ['ჩანაცვლება', '[YouTube-ის id]'],
  ])('არასწორი: %s → null', (_name, input) => {
    expect(parseYouTube(input)).toBeNull();
  });
});

describe('F10: id, ჩანაცვლება, კადრი, CSP', () => {
  it('isYouTubeId / isPlaceholder', () => {
    expect(isYouTubeId(ID)).toBe(true);
    expect(isYouTubeId('[YouTube-ის id]')).toBe(false);
    expect(isPlaceholder('[YouTube-ის id]')).toBe(true);
    expect(isPlaceholder(ID)).toBe(false);
  });

  it('კადრი: maxres → hq; არავალიდურ id-ზე null (ჩანაცვლების ჩარჩო)', () => {
    expect(youtubeThumbnail(ID)).toBe(`https://i.ytimg.com/vi/${ID}/maxresdefault.jpg`);
    expect(youtubeThumbnail(ID, 'hq')).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
    expect(youtubeThumbnail('[YouTube-ის id]')).toBeNull();
    expect(youtubePoster(ID)).toEqual({
      src: `https://i.ytimg.com/vi/${ID}/maxresdefault.jpg`,
      fallbackSrc: `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`,
      alt: '',
      ratio: '16:9',
    });
    expect(youtubePoster(null).src).toBeNull();
  });

  it('ჩაშენება youtube-nocookie.com-ზეა; CSP — frame / script / img', () => {
    expect(youtubeEmbedUrl(ID)).toBe(`https://www.youtube-nocookie.com/embed/${ID}`);
    expect(YOUTUBE_CSP).toEqual({
      'frame-src': ['https://www.youtube-nocookie.com'],
      'script-src': ['https://www.youtube.com'],
      'img-src': ['https://i.ytimg.com'],
    });
  });
});
