import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured =
  Boolean(url && key) &&
  new URLSearchParams(window.location.search).get("demo") !== "1";
const options = (storageKey) => ({
  auth: {
    storageKey,
    storage: sessionStorage,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
// Separate sessions: an administrator login must never replace a participant identity.
const client = configured
  ? createClient(url, key, options("pp-participant-auth"))
  : null;
const admin = configured
  ? createClient(url, key, options("pp-team-auth"))
  : null;
export function ensureSuccess(result) {
  if (result.error) throw result.error;
  return result.data;
}
export const backend = {
  async begin() {
    if (!client) return "demo";
    const { session } = ensureSuccess(await client.auth.getSession());
    if (session?.user?.is_anonymous) return session.user.id;
    const data = ensureSuccess(await client.auth.signInAnonymously());
    return data.user.id;
  },
  async save(study, expectedRevision = 0) {
    if (!client) return;
    const result = await client.rpc("save_study_session", {
      payload: study,
      expected_revision: expectedRevision,
    });
    return ensureSuccess(result);
  },
  async end() {
    if (client) ensureSuccess(await client.auth.signOut({ scope: "local" }));
  },
  async login(email, password) {
    if (!admin)
      throw new Error("Configure o Supabase para acessar os resultados reais.");
    ensureSuccess(await admin.auth.signInWithPassword({ email, password }));
    const { user } = ensureSuccess(await admin.auth.getUser());
    const member = ensureSuccess(
      await admin
        .from("team_members")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    );
    if (!member || user.is_anonymous) {
      await admin.auth.signOut({ scope: "local" });
      throw new Error("Conta sem acesso à equipe.");
    }
  },
  async results() {
    if (!admin) throw new Error("Supabase não configurado.");
    let rows = [];
    let from = 0;
    // Supabase has a default page limit: explicitly page to keep CSV and graphs complete.
    for (;;) {
      const data = ensureSuccess(
        await admin
          .from("study_sessions")
          .select("*")
          .order("started_at", { ascending: false })
          .order("id")
          .range(from, from + 499),
      );
      rows = rows.concat(data);
      if (data.length < 500) return rows;
      from += 500;
    }
  },
  async logout() {
    if (admin) ensureSuccess(await admin.auth.signOut({ scope: "local" }));
  },
};
