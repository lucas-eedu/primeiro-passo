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
  it("não conclui uma tarefa sem iniciá-la nem com ação incorreta", () => {
    let s = recordAction(
      study(),
      "filter",
      { area: "Tecnologia", shift: "Manhã" },
      2000,
    );
    expect(s.tasks[0].status).toBe("pending");
    s = startTask(s, 3000);
    s = recordAction(s, "filter", { area: "Tecnologia", shift: "Tarde" }, 4000);
    expect(s.tasks[0].status).toBe("active");
    s = recordAction(s, "filter", { area: "Tecnologia", shift: "Manhã" }, 6000);
    expect(s.tasks[0]).toMatchObject({
      status: "completed",
      duration_ms: 3000,
    });
    expect(s.tasks[1].status).toBe("pending");
  });
  it("registra ajuda e desistência sem contá-la como sucesso", () => {
    let s = startTask(study(), 2000);
    s = recordAction(s, "help", {}, 3000);
    s = finishTask(s, "skipped", 7000);
    expect(s.tasks[0]).toMatchObject({
      help_count: 1,
      status: "skipped",
      duration_ms: 5000,
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
    expect(s.tasks.map((t) => t.duration_ms)).toEqual([3000, 2000, 4000]);
    expect(summarize([s])).toMatchObject({
      total: 1,
      finished: 1,
      averageEase: 4,
    });
  });
  it("mantém métricas vazias sem inventar zero como avaliação", () => {
    expect(summarize([])).toMatchObject({ total: 0, averageEase: null });
    expect(summarize([study()]).tasks[0].successRate).toBeNull();
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
