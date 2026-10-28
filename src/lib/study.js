import { jobs } from "./jobs";
export const TASKS = [
  {
    id: "filter",
    title: "Encontre seu caminho",
    instruction:
      "Imagine que você estuda à noite e busca um estágio na área de Tecnologia, no turno da Manhã. Use os filtros para encontrar essas oportunidades.",
    hint: "Escolha Tecnologia em Área do estágio e Manhã em Turno. Depois, selecione Buscar vagas.",
  },
  {
    id: "view",
    title: "Conheça a oportunidade",
    instruction:
      "Encontre a vaga “Estágio em Desenvolvimento Web”, da Nexo Digital, e abra seus detalhes para conhecer as atividades e os requisitos.",
    hint: "Na lista de vagas, procure Estágio em Desenvolvimento Web e selecione Ver oportunidade.",
  },
  {
    id: "apply",
    title: "Dê o primeiro passo",
    instruction:
      "Simule sua candidatura à vaga “Estágio em Desenvolvimento Web”, da Nexo Digital. Nenhum currículo será enviado.",
    hint: "Abra os detalhes da vaga, selecione Simular candidatura e confirme a simulação.",
  },
];
export const currentTask = (s) =>
  s.tasks.findIndex((t) => ["pending", "active"].includes(t.status));
export function createStudy(
  { name, course, consent },
  now = Date.now(),
  id = crypto.randomUUID(),
) {
  if (!name?.trim() || !course?.trim() || consent !== true)
    throw new Error("Preencha seu nome, curso e aceite de participação.");
  return {
    id,
    participant_name: name.trim().slice(0, 80),
    course: course.trim().slice(0, 100),
    consent: true,
    consent_version: "2026-10-v1",
    started_at: new Date(now).toISOString(),
    completed_at: null,
    status: "in_progress",
    tasks: TASKS.map((t) => ({
      id: t.id,
      status: "pending",
      started_at: null,
      duration_ms: null,
      help_count: 0,
    })),
    events: [],
    feedback: null,
  };
}
function event(s, type, payload, now, taskIndex = currentTask(s)) {
  return {
    ...s,
    events: [
      ...s.events,
      { type, payload, task: taskIndex, at: new Date(now).toISOString() },
    ].slice(-500),
  };
}
export function startTask(s, now = Date.now()) {
  const i = currentTask(s);
  if (i < 0 || s.tasks[i].status !== "pending") return s;
  return event(
    {
      ...s,
      tasks: s.tasks.map((t, n) =>
        n === i
          ? { ...t, status: "active", started_at: new Date(now).toISOString() }
          : t,
      ),
    },
    "start",
    {},
    now,
    i,
  );
}
export function finishTask(s, status, now = Date.now()) {
  const i = currentTask(s);
  if (
    i < 0 ||
    s.tasks[i].status !== "active" ||
    !["completed", "skipped"].includes(status)
  )
    return s;
  return event(
    {
      ...s,
      tasks: s.tasks.map((t, n) =>
        n === i
          ? {
              ...t,
              status,
              duration_ms: Math.max(0, now - Date.parse(t.started_at)),
            }
          : t,
      ),
    },
    status,
    {},
    now,
    i,
  );
}
export function recordAction(s, type, payload = {}, now = Date.now()) {
  const i = currentTask(s);
  if (i < 0 || s.tasks[i].status !== "active") return s;
  let next = event(s, type, payload, now, i);
  if (type === "help")
    next = {
      ...next,
      tasks: next.tasks.map((t, n) =>
        n === i ? { ...t, help_count: t.help_count + 1 } : t,
      ),
    };
  const correct =
    (i === 0 &&
      type === "filter" &&
      payload.area === "Tecnologia" &&
      payload.shift === "Manhã" &&
      filterJobs(jobs, payload).length > 0) ||
    (i === 1 && type === "view" && payload.jobId === "web") ||
    (i === 2 && type === "apply" && payload.jobId === "web");
  return correct ? finishTask(next, "completed", now) : next;
}
export function finishStudy(s, feedback, now = Date.now()) {
  if (currentTask(s) !== -1)
    throw new Error("Encerre as três tarefas antes de avaliar.");
  const ease = Number(feedback.ease);
  if (!Number.isInteger(ease) || ease < 1 || ease > 5)
    throw new Error("Escolha uma avaliação de 1 a 5.");
  return {
    ...s,
    status: "completed",
    completed_at: new Date(now).toISOString(),
    feedback: {
      ease,
      comment: String(feedback.comment || "")
        .trim()
        .slice(0, 1500),
    },
  };
}
const normalize = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function filterJobs(jobs, { search = "", area = "", shift = "" }) {
  return jobs.filter(
    (j) =>
      (!area || j.area === area) &&
      (!shift || j.shift === shift) &&
      normalize(`${j.title} ${j.company} ${j.tags.join(" ")}`).includes(
        normalize(search.trim()),
      ),
  );
}
export function summarize(rows) {
  const rated = rows.filter(
    (r) =>
      r.status === "completed" &&
      r.feedback?.ease >= 1 &&
      r.feedback?.ease <= 5,
  );
  return {
    total: rows.length,
    finished: rows.filter((r) => r.status === "completed").length,
    averageEase: rated.length
      ? rated.reduce((n, r) => n + r.feedback.ease, 0) / rated.length
      : null,
    tasks: TASKS.map((t, i) => {
      const attempts = rows
        .map((r) => r.tasks[i])
        .filter((t) => t && t.status !== "pending");
      const completed = attempts.filter((t) => t.status === "completed");
      const measured = attempts.filter((t) => t.duration_ms !== null);
      return {
        ...t,
        attempts: attempts.length,
        completed: completed.length,
        successRate: attempts.length
          ? (completed.length / attempts.length) * 100
          : null,
        averageSeconds: measured.length
          ? measured.reduce((n, t) => n + t.duration_ms, 0) /
            measured.length /
            1000
          : null,
        helpCount: attempts.reduce((n, t) => n + t.help_count, 0),
      };
    }),
  };
}
function cell(value) {
  let s = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(s) || /^[\t\r\n]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function toCsv(rows) {
  const header = [
    "id",
    "nome_apelido",
    "curso",
    "inicio_utc",
    "fim_utc",
    "situacao",
    "aceite_versao",
    ...TASKS.flatMap((_, i) => [
      `t${i + 1}_situacao`,
      `t${i + 1}_segundos`,
      `t${i + 1}_ajudas`,
    ]),
    "facilidade_1_a_5",
    "comentario",
    "eventos_json",
  ];
  const data = rows.map((r) => [
    r.id,
    r.participant_name,
    r.course,
    r.started_at,
    r.completed_at,
    r.status,
    r.consent_version,
    ...r.tasks.flatMap((t) => [
      t.status,
      t.duration_ms == null ? "" : t.duration_ms / 1000,
      t.help_count,
    ]),
    r.feedback?.ease,
    r.feedback?.comment,
    JSON.stringify(r.events),
  ]);
  return (
    "\uFEFF" +
    [header, ...data].map((row) => row.map(cell).join(";")).join("\r\n")
  );
}
