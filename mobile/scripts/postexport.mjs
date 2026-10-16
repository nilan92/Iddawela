#!/usr/bin/env node
// Post-export for the web build: copy public/, add fonts, PWA manifest, icons and the styles used by the
// server-rendered (SEO) markup that sits inside #root until the app takes over.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(process.argv[2] || path.join(root, 'dist'));
fs.cpSync(path.join(root, 'public'), dist, { recursive: true });
const idx = path.join(dist, 'index.html');
let html = fs.readFileSync(idx, 'utf8');
const entry = (html.match(/\/_expo\/static\/js\/web\/[^"]+\.js/) || [])[0] || '';
const head = `
<meta name="theme-color" content="#15110E">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="manifest" href="/manifest.json">
<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Iddawela">
<link rel="preload" href="/fonts/Fraunces-latin-n300-900.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/Inter-latin-n300-800.woff2" as="font" type="font/woff2" crossorigin>
${entry ? `<link rel="preload" href="${entry}" as="script">` : ''}
<link rel="stylesheet" href="/fonts/fonts.css">
<style id="ssr-css">
html,body{margin:0;background:#15110E}
#root{display:flex;flex-direction:column;min-height:100vh}
.ssr{font-family:Inter,'Noto Sans Sinhala',system-ui,sans-serif;color:#15110E;background:#F6EFE2;min-height:100vh}
.ssr header{background:#15110E;color:#F6EFE2;padding:18px 20px;display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(201,162,74,.22)}
.ssr .brand{font-family:Fraunces,'Abhaya Libre',Georgia,serif;font-size:22px;color:#F6EFE2;text-decoration:none;font-weight:600}
.ssr .brand span{color:#C9A24A;font-size:14px;margin-left:6px}
.ssr nav ul{list-style:none;display:flex;flex-wrap:wrap;gap:14px;margin:0;padding:0}
.ssr nav a{color:#E9DFCB;text-decoration:none;font-size:14.5px;font-weight:600}
.ssr main{max-width:880px;margin:0 auto;padding:48px 20px 64px}
.ssr h1{font-family:Fraunces,'Abhaya Libre',Georgia,serif;font-size:clamp(34px,6vw,56px);line-height:1.05;margin:0 0 18px;font-weight:600;letter-spacing:-.02em}
.ssr h2{font-family:Fraunces,'Abhaya Libre',Georgia,serif;font-size:28px;margin:36px 0 12px;font-weight:600}
.ssr p,.ssr li{font-size:17px;line-height:1.7;color:#2E241D}
.ssr a{color:#8F1D1D}
.ssr footer{background:#15110E;color:#B9AC95;padding:28px 20px;font-size:14px;text-align:center}
</style>`;
html = html.replace('</head>', head + '\n</head>');
html = html.replace(/<noscript>[\s\S]*?<\/noscript>/, '');
fs.writeFileSync(idx, html);
// service worker: cache-first for hashed bundles, fonts and images; network-first for pages; never cache /api
const sw = fs.readFileSync(path.join(root, 'scripts', 'sw.template.js'), 'utf8').replace('__VERSION__', String(Date.now()));
fs.writeFileSync(path.join(dist, 'sw.js'), sw);
console.log('postexport: ok', entry);
