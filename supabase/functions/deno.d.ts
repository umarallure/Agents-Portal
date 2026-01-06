/// <reference types="https://deno.land/x/types/index.d.ts" />

declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
  };
}

declare const fetch: typeof globalThis.fetch;
declare const Response: typeof globalThis.Response;
declare const Request: typeof globalThis.Request;
declare const console: typeof globalThis.console;
declare const URLSearchParams: typeof globalThis.URLSearchParams;

// Allow URL imports (Deno-style)
declare module "https://*" {
  const content: any;
  export default content;
  export * from content;
}

