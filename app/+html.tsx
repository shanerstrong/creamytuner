import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1, shrink-to-fit=no" name="viewport" />
        <script dangerouslySetInnerHTML={{ __html: "if ('scrollRestoration' in history) history.scrollRestoration = 'manual';" }} />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'html, body, #root { background: #090D20; min-height: 100%; } body { margin: 0; }' }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
