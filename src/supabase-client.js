// src/supabase-client.js
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// TEMP: confirm values load (restart Vite after changing .env)
console.log("[Supabase cfg]", url, key ? key.slice(0, 8) : "(missing)");

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "cuttime-auth",
  },
});
