import { Html, Head, Main, NextScript } from 'next/document';

/**
 * Self-hosted Roboto (Apache 2.0) — the Google Analytics UI typeface. Served
 * relative to the injected <base href> under the report CSP, so the @font-face
 * lives inline in the head and the urls stay relative (see template README).
 */
const FONT_CSS = `
@font-face{font-family:'Roboto';font-style:normal;font-weight:400;font-display:swap;src:url("fonts/roboto-400.woff2") format("woff2");}
@font-face{font-family:'Roboto';font-style:normal;font-weight:500;font-display:swap;src:url("fonts/roboto-500.woff2") format("woff2");}
@font-face{font-family:'Roboto';font-style:normal;font-weight:700;font-display:swap;src:url("fonts/roboto-700.woff2") format("woff2");}
`;

export default function Document() {
  return (
    <Html>
      <Head>
        <style dangerouslySetInnerHTML={{ __html: FONT_CSS }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
