// Server-only. Never import this from a 'use client' file — anything a
// client component imports ends up in the browser bundle.
export const SESSION_SECRET = process.env.SESSION_SECRET ?? ''
