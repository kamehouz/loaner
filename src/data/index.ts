import { createLocalStore } from './localStore';
import { createSupabaseStore } from './supabaseStore';
import type { DataStore } from './store';

// The Supabase project ("loaner New") URL and publishable key are public by design
// (access is enforced by sign-in and Row Level Security), so they are built in.
// They deliberately ignore VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY: the Vercel
// project still carries those from the previous app, pointing at its own database.
// Set VITE_DEMO=1 to run on sample data in the browser instead.
const SUPABASE_URL = 'https://fcteecadouqozzctbwpp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_x3ooCTmGHCdX1hPUkqNfOQ_JAyqO2D8';

// Read the reset-link markers before the Supabase client consumes and clears the URL hash.
const hash = new URLSearchParams(window.location.hash.slice(1));
/** The page was opened from a password reset email. */
export const openedFromRecoveryLink = hash.get('type') === 'recovery';
/** The reset or invite link was rejected (usually expired or already used). */
export const authLinkError = hash.get('error_description')?.replace(/\+/g, ' ') ?? null;

const demo = import.meta.env.VITE_DEMO === '1' || import.meta.env.MODE === 'test';

export const store: DataStore = demo ? createLocalStore() : createSupabaseStore(SUPABASE_URL, SUPABASE_KEY);
export type { DataStore, Session } from './store';
