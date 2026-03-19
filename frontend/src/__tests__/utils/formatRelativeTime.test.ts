import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { formatRelativeTime } from '../../utils/formatRelativeTime';

describe('formatRelativeTime', () => {
  it('returns "agora mesmo" for timestamps less than 1 minute ago', () => {
    const now = new Date();
    const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000).toISOString();
    expect(formatRelativeTime(thirtySecondsAgo)).toBe('agora mesmo');
  });

  it('returns "agora mesmo" for the current moment', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('agora mesmo');
  });

  it('returns "ha Xmin" for timestamps between 1 and 59 minutes ago', () => {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    expect(formatRelativeTime(thirtyMinutesAgo)).toBe('ha 30min');
  });

  it('returns "ha 1min" for exactly 1 minute ago', () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000).toISOString();
    expect(formatRelativeTime(oneMinuteAgo)).toBe('ha 1min');
  });

  it('returns "ha Xh" for timestamps between 1 and 23 hours ago', () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe('ha 2h');
  });

  it('returns "ha 1h" for exactly 1 hour ago', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(oneHourAgo)).toBe('ha 1h');
  });

  it('returns "ha X dias" for timestamps 1 or more days ago', () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(oneDayAgo)).toBe('ha 1 dias');
  });

  it('returns "ha 30 dias" for 30 days ago', () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(thirtyDaysAgo)).toBe('ha 30 dias');
  });

  it('returns "agora mesmo" for future timestamps', () => {
    const future = new Date(Date.now() + 60 * 1000).toISOString();
    expect(formatRelativeTime(future)).toBe('agora mesmo');
  });

  it('returns a non-empty ASCII-only string for any valid ISO timestamp', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 365 * 24 * 60 * 60 * 1000 }).map(
          (offsetMs) => new Date(Date.now() - offsetMs).toISOString()
        ),
        (isoString) => {
          const result = formatRelativeTime(isoString);

          expect(result.length).toBeGreaterThan(0);

          for (const char of result) {
            expect(char.charCodeAt(0)).toBeLessThanOrEqual(127);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns the same string when called twice within the same second', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 365 * 24 * 60 * 60 * 1000 }).map(
          (offsetMs) => new Date(Date.now() - offsetMs).toISOString()
        ),
        (isoString) => {
          const result1 = formatRelativeTime(isoString);
          const result2 = formatRelativeTime(isoString);
          expect(result1).toBe(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('output matches expected format patterns', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 365 * 24 * 60 * 60 * 1000 }).map(
          (offsetMs) => new Date(Date.now() - offsetMs).toISOString()
        ),
        (isoString) => {
          const result = formatRelativeTime(isoString);
          const validPattern = /^(agora mesmo|ha \d+min|ha \d+h|ha \d+ dias)$/;
          expect(result).toMatch(validPattern);
        }
      ),
      { numRuns: 100 }
    );
  });
});
