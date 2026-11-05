import { describe, expect, it } from 'vitest';

import { ConfigError, ENV_KEYS, loadConfig } from '../config.js';

const URI = 'mongodb+srv://user:s3cret-pass@cluster0.example.mongodb.net/?retryWrites=true';

describe('loadConfig', () => {
  it('development: ნაგულისხმევი მნიშვნელობები, ბაზის გარეშე', () => {
    const config = loadConfig({});
    expect(config).toEqual({
      env: 'development',
      host: '127.0.0.1',
      port: 3000,
      logLevel: 'info',
      trustProxy: false,
      bodyLimit: 1_048_576,
      mongo: { uri: null, dbName: 'meti-chartuloba' },
    });
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.mongo)).toBe(true);
  });

  it('test: ლოგი ჩუმადაა', () => {
    expect(loadConfig({ NODE_ENV: 'test' }).logLevel).toBe('silent');
  });

  it('production: 0.0.0.0, MONGODB_URI სავალდებულოა', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(ConfigError);
    const config = loadConfig({ NODE_ENV: 'production', MONGODB_URI: URI, TRUST_PROXY: '1' });
    expect(config.host).toBe('0.0.0.0');
    expect(config.trustProxy).toBe(1);
    expect(config.mongo.uri).toBe(URI);
  });

  it('სტრიქონები რიცხვად / სიად იქცევა, ჰარი იჭრება', () => {
    const config = loadConfig({
      PORT: ' 8080 ',
      LOG_LEVEL: 'debug',
      BODY_LIMIT: '65536',
      MONGODB_DB: 'mc_staging',
      HOST: '0.0.0.0',
    });
    expect(config).toMatchObject({
      port: 8080,
      logLevel: 'debug',
      bodyLimit: 65_536,
      host: '0.0.0.0',
      mongo: { dbName: 'mc_staging' },
    });
  });

  it('ცარიელი ცვლადი = არ არის', () => {
    expect(loadConfig({ PORT: '', MONGODB_URI: '  ' }).port).toBe(3000);
  });

  it('არასწორი მნიშვნელობები — ყველა ერთად, სახელით', () => {
    try {
      loadConfig({ NODE_ENV: 'staging', PORT: '70000', LOG_LEVEL: 'loud', TRUST_PROXY: 'yes' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      const { problems } = /** @type {ConfigError} */ (error);
      expect(problems.join('\n')).toMatch(/NODE_ENV/);
      expect(problems.join('\n')).toMatch(/PORT/);
      expect(problems.join('\n')).toMatch(/LOG_LEVEL/);
      expect(problems.join('\n')).toMatch(/TRUST_PROXY/);
    }
  });

  it('შეცდომის ტექსტი env-ის მნიშვნელობას (საიდუმლოს) არ იმეორებს', () => {
    const bad = 'postgres://user:s3cret-pass@db.example/x';
    try {
      loadConfig({ NODE_ENV: 'production', MONGODB_URI: bad });
      expect.unreachable();
    } catch (error) {
      const message = /** @type {Error} */ (error).message;
      expect(message).toMatch(/MONGODB_URI/);
      expect(message).not.toContain('s3cret');
      expect(message).not.toContain('postgres://');
    }
  });

  it('სხვა env ცვლადებს არ კითხულობს', () => {
    expect(ENV_KEYS).toEqual([
      'NODE_ENV',
      'HOST',
      'PORT',
      'LOG_LEVEL',
      'TRUST_PROXY',
      'BODY_LIMIT',
      'MONGODB_URI',
      'MONGODB_DB',
    ]);
    expect(() => loadConfig({ SOMETHING_ELSE: 'x', PATH: '/bin' })).not.toThrow();
  });
});
