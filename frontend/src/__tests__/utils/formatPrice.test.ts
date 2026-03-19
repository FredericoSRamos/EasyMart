import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatPrice } from '../../utils/formatPrice';
describe('formatPrice', () => {
  it('formats number inputs as pt-BR currency (R$ prefix, comma decimal)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 9999, noNaN: true }),
        (price) => {
          const result = formatPrice(price);
          expect(result.replace(/\u00a0/g, ' ')).toMatch(/^R\$\s/);
          expect(result).toMatch(/,/);
        }
      )
    );
  });

  it('formats string inputs as pt-BR currency (R$ prefix, comma decimal)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 9999, noNaN: true }),
        (price) => {
          const result = formatPrice(String(price));
          expect(result.replace(/\u00a0/g, ' ')).toMatch(/^R\$\s/);
          expect(result).toMatch(/,/);
        }
      )
    );
  });
});
