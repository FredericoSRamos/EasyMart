import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import ErrorState from '../../components/ErrorState';

const messageString = fc
  .base64String({ minLength: 4, maxLength: 48 })
  .map((s) => s.replace(/=/g, 'x'));

describe('ErrorState', () => {
  it('renders the message text for any string input', () => {
    fc.assert(
      fc.property(messageString, (message) => {
        const { container, unmount } = render(
          <ErrorState message={message} onRetry={() => {}} />
        );
        const p = container.querySelector('p');
        expect(p?.textContent?.trim()).toBe(message);
        unmount();
      })
    );
  });

  it('always renders a Retry button', { timeout: 30_000 }, () => {
    fc.assert(
      fc.property(messageString, (message) => {
        const { container, unmount } = render(
          <ErrorState message={message} onRetry={() => {}} />
        );
        const button = container.querySelector('button');
        expect(button).toBeTruthy();
        unmount();
      })
    );
  });

  it('clicking Retry invokes onRetry callback', { timeout: 30_000 }, async () => {
    await fc.assert(
      fc.asyncProperty(messageString, async (message) => {
        const onRetry = vi.fn();
        const user = userEvent.setup();
        const { container, unmount } = render(
          <ErrorState message={message} onRetry={onRetry} />
        );
        const button = container.querySelector('button') as HTMLButtonElement;
        await user.click(button);
        expect(onRetry).toHaveBeenCalledOnce();
        unmount();
      }),
      { numRuns: 25 }
    );
  });
});
