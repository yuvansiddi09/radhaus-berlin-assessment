// Server-only. Never import this from a 'use client' file — anything a
// client component imports ends up in the browser bundle.
export const SERVICE_KEY = process.env.SERVICE_KEY ?? ''
