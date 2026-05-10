/* eslint-disable no-undef */
declare module 'react-dom/client' {
  import type { ReactNode } from 'react';
  export function createRoot(container: Element | DocumentFragment): {
    render(_children: ReactNode): void;
    unmount(): void;
  };
}
