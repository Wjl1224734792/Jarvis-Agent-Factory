declare module 'react-syntax-highlighter' {
  import type { ComponentType, CSSProperties } from 'react';
  interface Style {
    [key: string]: CSSProperties;
  }
  interface SyntaxHighlighterProps {
    language?: string;
    style?: Style;
    children: string;
    PreTag?: string;
    [key: string]: unknown;
  }
  export const Prism: ComponentType<SyntaxHighlighterProps>;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  const oneLight: Record<string, import('react').CSSProperties>;
  export { oneLight };
}
