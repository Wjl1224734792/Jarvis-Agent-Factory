import '@testing-library/jest-dom';

/**
 * React 19.2.6 does not export `act` from the main package CJS bundle,
 * but @testing-library/react and testing-library/user-event rely on
 * `React.act` to flush React's work queue.
 *
 * This polyfill uses flushSync to ensure pending React updates
 * (including those scheduled by createRoot.render()) are flushed
 * synchronously within act(), which is the expected behavior for tests.
 */
import React from 'react';
import { flushSync } from 'react-dom';

if (typeof (React as Record<string, unknown>).act !== 'function') {
  (React as Record<string, unknown>).act = function actPolyfill(
    callback: () => void | (() => void) | Promise<unknown>,
  ) {
    let syncResult: void | (() => void) | Promise<unknown> | undefined;

    // Run the callback inside flushSync to flush React's pending work
    try {
      flushSync(() => {
        syncResult = callback();
      });
    } catch {
      // flushSync may throw if there's no pending work; fallback to direct call
      syncResult = callback();
    }

    // Handle the result — if async, chain the thenable
    if (
      syncResult !== null &&
      typeof syncResult === 'object' &&
      typeof (syncResult as Promise<unknown>).then === 'function'
    ) {
      return {
        then(resolve: (v: unknown) => void, reject?: (e: unknown) => void) {
          return (syncResult as Promise<unknown>).then(resolve, reject);
        },
      };
    }

    // Synchronous — return a resolved thenable
    return {
      then(resolve: (v: unknown) => void) {
        resolve(undefined);
      },
    };
  };
}
