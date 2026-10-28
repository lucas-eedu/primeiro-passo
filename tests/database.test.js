// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
let db;
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const team = "33333333-3333-4333-8333-333333333333";
const sessionA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const sessionB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
async function login(uid, anonymous = true) {
  await db.exec("reset role");
  await db.query(
    "select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claims', $2, false)",
    [uid, JSON.stringify({ sub: uid, is_anonymous: anonymous })],
  );
  await db.exec("set role authenticated");
}
const tasks = JSON.stringify(
  ["filter", "view", "apply"].map((id) => ({
    id,
    status: "pending",
    started_at: null,
    duration_ms: null,
    help_count: 0,
  })),
);
async function insert(id, owner) {
  return db.query(
    `insert into public.study_sessions(id,owner_id,participant_name,course,consent,consent_version,started_at,status,tasks) values($1,$2,'Ana','TI',true,'2026-10-v1',now(),'in_progress',$3)`,
    [id, owner, tasks],
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select current_setting('request.jwt.claims', true)::jsonb $$;
    grant usage on schema auth, public to authenticated; grant execute on function auth.uid(), auth.jwt() to authenticated;
    insert into auth.users values ('${alice}'),('${bob}'),('${team}');`);
  await db.exec(
    readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8"),
  );
  await db.query("insert into public.team_members values($1)", [team]);
}, 30000);
afterAll(async () => {
  await db?.close();
});
it("isola as linhas dos participantes e permite a leitura pela equipe", async () => {
  await login(alice);
  await insert(sessionA, alice);
  await expect(insert(sessionB, bob)).rejects.toThrow();
  await login(bob);
  await insert(sessionB, bob);
  const own = await db.query("select id from public.study_sessions");
  expect(own.rows.map((r) => r.id)).toEqual([sessionB]);
  await db.query(
    "update public.study_sessions set participant_name='Invasão' where id=$1",
    [sessionA],
  );
  await expect(
    db.query("insert into public.team_members values($1)", [bob]),
  ).rejects.toThrow();
  await expect(
    db.query("delete from public.study_sessions where id=$1", [sessionB]),
  ).rejects.toThrow();
  await login(team, false);
  const all = await db.query(
    "select id,participant_name from public.study_sessions order by id",
  );
  expect(all.rows).toHaveLength(2);
  expect(all.rows[0].participant_name).toBe("Ana");
  await db.query(
    "update public.study_sessions set participant_name='Admin editou' where id=$1",
    [sessionA],
  );
  expect(
    (
      await db.query(
        "select participant_name from public.study_sessions where id=$1",
        [sessionA],
      )
    ).rows[0].participant_name,
  ).toBe("Ana");
});
it("impede autoconcessão de acesso, troca de proprietário e remoção do aceite", async () => {
  await login(alice);
  await expect(
    db.query("update public.study_sessions set owner_id=$1 where id=$2", [
      team,
      sessionA,
    ]),
  ).rejects.toThrow();
  await expect(
    db.query("update public.study_sessions set consent=false where id=$1", [
      sessionA,
    ]),
  ).rejects.toThrow();
  await expect(
    db.query(
      "update public.study_sessions set status='completed', completed_at=now(), feedback='{}' where id=$1",
      [sessionA],
    ),
  ).rejects.toThrow();
});
it("bloqueia leitura por visitante sem sessão", async () => {
  await db.exec("reset role; set role anon;");
  await expect(
    db.query("select * from public.study_sessions"),
  ).rejects.toThrow();
});
it("rejeita tarefas malformadas antes que possam quebrar o painel", async () => {
  await login(alice);
  for (const value of [
    "[null,null,null]",
    "[{},{},{}]",
    JSON.stringify([
      { id: "filter", status: "completed", duration_ms: -1, help_count: 0 },
      {},
      {},
    ]),
  ]) {
    await expect(
      db.query("update public.study_sessions set tasks=$1 where id=$2", [
        value,
        sessionA,
      ]),
    ).rejects.toThrow();
  }
});
it("salvamento condicional bloqueia aba desatualizada e aceita reenvio idêntico", async () => {
  await login(alice);
  const row = (
    await db.query("select * from public.study_sessions where id=$1", [
      sessionA,
    ])
  ).rows[0];
  const payload = { ...row, participant_name: "Revisão nova" };
  delete payload.revision;
  const save = (body, expected) =>
    db.query(
      "select public.save_study_session($1::jsonb,$2::integer) as revision",
      [JSON.stringify(body), expected],
    );
  expect((await save(payload, 1)).rows[0].revision).toBe(2);
  expect((await save(payload, 1)).rows[0].revision).toBe(2);
  await expect(
    save({ ...payload, participant_name: "Aba antiga" }, 1),
  ).rejects.toThrow(/outra aba/);
  expect(
    (
      await db.query(
        "select participant_name from public.study_sessions where id=$1",
        [sessionA],
      )
    ).rows[0].participant_name,
  ).toBe("Revisão nova");
});
it("aceita uma participação completa pela mesma função usada no frontend", async () => {
  const id = "44444444-4444-4444-8444-444444444444";
  await db.exec("reset role");
  await db.query("insert into auth.users values($1)", [id]);
  await login(id);
  const row = {
    id,
    owner_id: id,
    participant_name: "Teste de integração",
    course: "Computação",
    consent: true,
    consent_version: "2026-10-v1",
    started_at: "2026-10-27T12:00:00.000Z",
    completed_at: null,
    status: "in_progress",
    tasks: JSON.parse(tasks),
    events: [],
    feedback: null,
  };
  const save = (body, revision) =>
    db.query(
      "select public.save_study_session($1::jsonb,$2::integer) as revision",
      [JSON.stringify(body), revision],
    );
  expect((await save(row, 0)).rows[0].revision).toBe(1);
  const complete = {
    ...row,
    status: "completed",
    completed_at: "2026-10-27T12:03:00.000Z",
    tasks: row.tasks.map((t) => ({
      ...t,
      status: "completed",
      started_at: row.started_at,
      duration_ms: 1000,
    })),
    feedback: { ease: 5, comment: "Tudo certo" },
  };
  expect((await save(complete, 1)).rows[0].revision).toBe(2);
  expect((await save(complete, 1)).rows[0].revision).toBe(2);
  expect(
    (
      await db.query("select status from public.study_sessions where id=$1", [
        id,
      ])
    ).rows[0].status,
  ).toBe("completed");
});
it("rejeita comentário estruturado que não pode ser exibido como texto", async () => {
  const id = "44444444-4444-4444-8444-444444444444";
  await login(id);
  await expect(
    db.query(
      `update public.study_sessions set feedback='{"ease":5,"comment":{"texto":"inválido"}}' where id=$1`,
      [id],
    ),
  ).rejects.toThrow();
});
