import { createLocalStore } from './localStore';
import { createSupabaseStore } from './supabaseStore';
import type { DataStore } from './store';

// The Supabase project URL and publishable key are public by design (access is
// enforced by sign-in and Row Level Security), so they are built in here.
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY override them, and setting
// VITE_DEMO=1 runs on sample data in the browser instead.
const DEFAULT_URL = 'https://fcteecadouqozzctbwpp.supabase.co';
const DEFAULT_KEY = 'sb_publishable_x3ooCTmGHCdX1hPUkqNfOQ_JAyqO2D8';

const env = import.meta.env;
const url = (env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_URL;
const key = (env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEFAULT_KEY;
const demo = env.VITE_DEMO === '1' || env.MODE === 'test';

export const store: DataStore = demo ? createLocalStore() : createSupabaseStore(url.replace(/\/rest\/v1\/?$/, ''), key);
export type { DataStore, Session } from './store';
