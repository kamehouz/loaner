import { createLocalStore } from './localStore';
import { createSupabaseStore } from './supabaseStore';
import type { DataStore } from './store';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const store: DataStore = url && key ? createSupabaseStore(url, key) : createLocalStore();
export type { DataStore, Session } from './store';
