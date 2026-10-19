import { createClient } from "@supabase/supabase-js";

const PLACEHOLDER_KEY = "METTEZ_VOTRE_CLE_SERVICE_ROLE_ICI";

export const createAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key === PLACEHOLDER_KEY) return null;
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
