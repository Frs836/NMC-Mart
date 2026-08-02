import { createRequire } from 'node:module';

// Vercel tidak menyalin/meng-compile server.ts ke dalam function bundle,
// jadi api function mengimpor bundle CJS hasil `npm run build` (dist/server.cjs).
const require = createRequire(import.meta.url);
const mod = require('../dist/server.cjs') as any;
const app = mod.default ?? mod;

export default app;
