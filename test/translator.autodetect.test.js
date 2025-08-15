// @jest-environment node
jest.mock('../src/lib/detect.js', () => ({
  detectLocal: (t) => ({ lang: /bonjour|français/i.test(t) ? 'fr' : 'en', confidence: 0.9 })
}));

describe('translator auto-detects source language', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('qwenTranslate uses detected source', async () => {
    const Providers = require('../src/lib/providers.js');
    const spy = jest.fn(async ({ source, text }) => ({ text: `SRC:${source}:${text}` }));
    Providers.register('dashscope', { translate: spy });

    const { qwenTranslate } = require('../src/translator.js');
    const res = await qwenTranslate({
      text: 'bonjour',
      source: 'auto',
      target: 'en',
      endpoint: 'https://dashscope-intl.aliyuncs.com/api/v1',
      model: 'm',
      noProxy: true
    });

    expect(res.text).toBe('SRC:fr:bonjour');
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0].source).toBe('fr');
  });

  test('qwenTranslateBatch detects once and uses same source for all', async () => {
    const Providers = require('../src/lib/providers.js');
    const spy = jest.fn(async ({ text }) => ({ text })); // echos batch text
    Providers.register('dashscope', { translate: spy });

    const { qwenTranslateBatch } = require('../src/translator.js');
    const res = await qwenTranslateBatch({
      texts: ['bonjour le monde', 'salut'],
      source: 'auto',
      target: 'en',
      endpoint: 'https://dashscope-intl.aliyuncs.com/api/v1',
      model: 'm',
      tokenBudget: 10000,
      maxBatchSize: 200,
      noProxy: true
    });

    expect(res.texts.length).toBe(2);
    // ensure provider was called at least once and the detected language was fr
    expect(spy).toHaveBeenCalled();
    const srcs = spy.mock.calls.map(c => c[0].source);
    expect(srcs.every(s => s === 'fr')).toBe(true);
  });
});
