# Cabeceras de seguridad

Dónde vive cada cabecera y por qué.

| Cabecera | Dónde | Valor |
|---|---|---|
| `Content-Security-Policy` | `src/proxy.ts` (por petición, lleva un nonce) | Ver `buildContentSecurityPolicy` en `src/lib/security-headers.ts` |
| `X-Content-Type-Options` | `next.config.ts` | `nosniff` |
| `Referrer-Policy` | `next.config.ts` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `next.config.ts` | `camera=(), microphone=(), geolocation=(), payment=()` |
| `Strict-Transport-Security` | `next.config.ts`, solo en producción | `max-age=31536000`, **sin** `includeSubDomains` |

## Content-Security-Policy

- Los scripts se permiten solo con el nonce de la petición o por hash (los dos scripts inline que fijan tema y tamaño de letra antes de pintar, en `src/lib/inline-scripts.ts`). Con `'strict-dynamic'` esos scripts pueden cargar sus propios chunks. No hay `'unsafe-inline'` en `script-src`.
- `style-src` conserva `'unsafe-inline'` porque Next.js y `next/font` inyectan `<style>` en línea. Es el único `unsafe-inline` y no ejecuta código.
- `frame-ancestors 'none'`: nadie puede incrustar la app. Si un flujo legítimo lo requiere, documenta la excepción aquí.
- `worker-src 'self'` es necesario para el service worker: sin él cae a `script-src`, donde `'strict-dynamic'` ignora `'self'`.
- Desarrollo añade `'unsafe-eval'` y websockets (HMR). Las previews de Vercel añaden `https://vercel.live` (barra de comentarios); producción no.
- Si agregas un script en línea nuevo, muévelo a `src/lib/inline-scripts.ts` y agrégalo a `getInlineScriptHashes`; si no, el navegador lo bloqueará.

## HSTS

Va sin `includeSubDomains` hasta auditar los subdominios del dominio de producción. Vercel ya sirve HSTS en sus dominios; esta cabecera cubre el dominio propio. No se envía en desarrollo (HTTP).

## Cómo verificarlo

`pnpm build && pnpm exec next start`, abre una ruta pública y una de `/admin`, y revisa la consola: no debe haber violaciones de CSP. Las cabeceras se ven con `curl -I`.
