import { describe, it, expect } from "vitest";
import {
  createStudy,
  startTask,
  recordAction,
  finishTask,
  finishStudy,
  summarize,
  toCsv,
  filterJobs,
} from "../src/lib/study.js";
import { jobs } from "../src/lib/jobs.js";
const study = () =>
  createStudy(
    { name: "Ana", course: "Computação", consent: true },
    1000,
    "test-id",
  );
describe("tarefas e evidências", () => {
  it("exige aceite e identificação", () => {
    expect(() =>
      createStudy({ name: " ", course: "TI", consent: true }),
    ).toThrow();
    expect(() =>
      createStudy({ name: "Ana", course: "TI", consent: false }),
    ).toThrow();
  });
  it("combina filtros e pesquisa sem depender de acentos", () => {
    expect(
      filterJobs(jobs, {
        area: "Tecnologia",
        shift: "Manhã",
        search: "desenvolvimento",
      }).map((j) => j.id),
    ).toEqual(["web"]);
    expect(
      filterJobs(jobs, { area: "Saúde", shift: "Manhã", search: "" }),
    ).toEqual([]);
  });
  it("avança automaticamente apenas quando a busca encontra resultados", () => {
    let s = study();
    expect(s.tasks[0].status).toBe("active");
    s = recordAction(s, "filter", { area: "Saúde", shift: "Manhã" }, 4000);
    expect(s.tasks[0].status).toBe("active");
    s = recordAction(s, "filter", { area: "Tecnologia", shift: "Manhã" }, 6000);
    expect(s.tasks[0]).toMatchObject({
      status: "completed",
      duration_ms: 5000,
    });
    expect(s.tasks[1]).toMatchObject({
      status: "active",
      started_at: new Date(6000).toISOString(),
    });
  });
  it("registra ajuda e desistência sem contá-la como sucesso", () => {
    let s = startTask(study(), 2000);
    s = recordAction(s, "help", {}, 3000);
    s = finishTask(s, "skipped", 7000);
    expect(s.tasks[0]).toMatchObject({
      help_count: 1,
      status: "skipped",
      duration_ms: 6000,
    });
    expect(s.events.map((e) => e.type)).toContain("help");
    expect(summarize([s]).tasks[0].successRate).toBe(0);
  });
  it("mede cada tarefa e só finaliza após todas serem encerradas", () => {
    expect(() => finishStudy(study(), { ease: 5 }, 8000)).toThrow();
    let s = startTask(study(), 2000);
    s = recordAction(s, "filter", { area: "Tecnologia", shift: "Manhã" }, 5000);
    s = startTask(s, 6000);
    s = recordAction(s, "view", { jobId: "web" }, 8000);
    s = startTask(s, 10000);
    s = recordAction(s, "apply", { jobId: "web" }, 14000);
    expect(() => finishStudy(s, { ease: 0 }, 15000)).toThrow();
    s = finishStudy(s, { ease: 4, comment: "Gostei" }, 15000);
    expect(s.status).toBe("completed");
    expect(s.tasks.map((t) => t.duration_ms)).toEqual([4000, 3000, 6000]);
    expect(summarize([s])).toMatchObject({
      total: 1,
      finished: 1,
      averageEase: 4,
    });
  });
  it("mantém métricas vazias sem inventar zero como avaliação", () => {
    expect(summarize([])).toMatchObject({ total: 0, averageEase: null });
    expect(summarize([study()]).tasks[1].successRate).toBeNull();
  });
  it("exporta desistentes e neutraliza fórmulas e aspas no CSV", () => {
    const s = study();
    s.participant_name = "=SUM(1,2)";
    s.feedback = { ease: 3, comment: 'texto "teste";\nnova linha' };
    const csv = toCsv([s]);
    expect(csv).toContain("'=SUM(1,2)");
    expect(csv).toContain('texto ""teste"";\nnova linha');
    expect(csv).toContain("pending");
  });
});
it("não conta busca vazia como sucesso mesmo com área e turno corretos", () => {
  const s = recordAction(
    startTask(study(), 2000),
    "filter",
    { area: "Tecnologia", shift: "Manhã", search: "xyzsemvaga" },
    3000,
  );
  expect(s.tasks[0].status).toBe("active");
});

it("permite navegar e candidatar-se a qualquer vaga sem usar os filtros", () => {
  let s = recordAction(study(), "view", { jobId: "marketing" }, 3000);
  expect(s.tasks.map((t) => t.status)).toEqual([
    "skipped",
    "completed",
    "active",
  ]);
  expect(s.events).toContainEqual(
    expect.objectContaining({
      type: "skipped",
      payload: { reason: "not_used" },
    }),
  );
  s = recordAction(s, "apply", { jobId: "marketing" }, 6000);
  expect(s.tasks.map((t) => t.status)).toEqual([
    "skipped",
    "completed",
    "completed",
  ]);
  expect(finishStudy(s, { ease: 5 }, 7000).status).toBe("completed");
});
it("aceita busca textual e ignora candidaturas sem vaga aberta", () => {
  let s = recordAction(
    study(),
    "filter",
    { search: "marketing", area: "", shift: "" },
    2000,
  );
  expect(s.tasks[0].status).toBe("completed");
  s = recordAction(s, "apply", { jobId: "marketing" }, 3000);
  expect(s.tasks[2].status).toBe("pending");
});
it("separa busca não utilizada de tentativa sem sucesso nas métricas", () => {
  const direct = recordAction(study(), "view", { jobId: "marketing" }, 3000);
  expect(summarize([direct]).tasks[0]).toMatchObject({
    attempts: 0,
    notUsedCount: 1,
    successRate: null,
  });
  const skipped = finishTask(study(), "skipped", 3000);
  expect(summarize([skipped]).tasks[0]).toMatchObject({
    attempts: 1,
    notUsedCount: 0,
    successRate: 0,
  });
});
it("contabiliza a tentativa de busca sem resultados antes da navegação direta", () => {
  let s = recordAction(study(), "filter", { search: "xyzsemvaga" }, 2000);
  s = recordAction(s, "view", { jobId: "web" }, 3000);
  expect(summarize([s]).tasks[0]).toMatchObject({
    attempts: 1,
    notUsedCount: 0,
    successRate: 0,
  });
});
