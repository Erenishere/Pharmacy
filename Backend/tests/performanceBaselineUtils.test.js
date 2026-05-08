const {
  parseMilliseconds,
  percentile,
  summarizeSamples,
} = require('../src/utils/performanceBaseline');

describe('performance baseline utilities', () => {
  it('parses response-time headers into numeric milliseconds', () => {
    expect(parseMilliseconds('42.35ms')).toBe(42.35);
    expect(parseMilliseconds('18')).toBe(18);
    expect(parseMilliseconds('not-a-number')).toBeNull();
    expect(parseMilliseconds(undefined)).toBeNull();
  });

  it('calculates percentile values from sorted copies', () => {
    const values = [50, 10, 30, 20, 40];

    expect(percentile(values, 50)).toBe(30);
    expect(percentile(values, 95)).toBe(50);
    expect(values).toEqual([50, 10, 30, 20, 40]);
  });

  it('summarizes samples against a route budget', () => {
    const summary = summarizeSamples([
      { ok: true, status: 200, durationMs: 90, serverMs: 80, payloadBytes: 1000 },
      { ok: true, status: 200, durationMs: 110, serverMs: 95, payloadBytes: 1200 },
      { ok: true, status: 200, durationMs: 130, serverMs: 100, payloadBytes: 1400 },
    ], 150);

    expect(summary).toMatchObject({
      samples: 3,
      successRate: 100,
      statusCodes: { 200: 3 },
      minMs: 90,
      maxMs: 130,
      avgMs: 110,
      p50Ms: 110,
      p95Ms: 130,
      avgServerMs: 91.67,
      avgPayloadBytes: 1200,
      budgetMs: 150,
      passed: true,
    });
  });
});
