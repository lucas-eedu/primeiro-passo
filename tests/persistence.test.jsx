import { it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useStudy } from "../src/lib/useStudy";
import { createStudy } from "../src/lib/study";
vi.mock("../src/lib/backend", () => ({
  configured: true,
  backend: { save: vi.fn(), end: vi.fn() },
}));
import { backend } from "../src/lib/backend";
it("não apresenta uma revisão nova como salva enquanto o envio está pendente", async () => {
  let release;
  backend.save.mockResolvedValueOnce(1).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const renders = [];
  const { result } = renderHook(() => {
    const value = useStudy();
    renders.push({ study: value.study, state: value.saveState });
    return value;
  });
  const initial = {
    ...createStudy({ name: "Ana", course: "TI", consent: true }),
    owner_id: "test",
  };
  await act(async () => result.current.setStudy(initial));
  await waitFor(() => expect(result.current.saveState).toBe("saved"));
  const next = { ...initial, participant_name: "Ana atualizada" };
  await act(async () => result.current.setStudy(next));
  expect(
    renders.filter((r) => r.study === next && r.state === "saved"),
  ).toHaveLength(0);
  await act(async () => release(2));
  await waitFor(() => expect(result.current.saveState).toBe("saved"));
});
it("serializa os envios para não sobrescrever o resultado recente com um antigo", async () => {
  let release;
  backend.save
    .mockReset()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    )
    .mockResolvedValue(3);
  const { result } = renderHook(useStudy);
  const initial = {
    ...createStudy({ name: "Ana", course: "TI", consent: true }),
    owner_id: "test",
  };
  await act(async () => result.current.setStudy(initial));
  const next = { ...initial, participant_name: "Atualizada" };
  await act(async () => result.current.setStudy(next));
  expect(backend.save).toHaveBeenCalledTimes(1);
  await act(async () => release(2));
  await waitFor(() => expect(backend.save).toHaveBeenLastCalledWith(next, 2));
  expect(result.current.saveState).toBe("saved");
});
it("restaura a revisão do servidor junto ao rascunho e sinaliza conflito", async () => {
  const initial = {
    ...createStudy({ name: "Ana", course: "TI", consent: true }),
    owner_id: "test",
  };
  sessionStorage.setItem(
    "pp-study-live-v2",
    JSON.stringify({ study: initial, revision: 7 }),
  );
  backend.save
    .mockReset()
    .mockRejectedValue({ code: "40001", message: "Outra aba" });
  const { result } = renderHook(useStudy);
  await waitFor(() => expect(result.current.conflict).toBe(true));
  expect(backend.save).toHaveBeenCalledWith(initial, 7);
  expect(result.current.saveState).toBe("error");
});
it("recupera resposta perdida antes de enviar a próxima alteração", async () => {
  let remote = null;
  let remoteRevision = 0;
  let lostResponse = true;
  backend.save
    .mockReset()
    .mockImplementation(async (snapshot, expectedRevision) => {
      if (JSON.stringify(remote) === JSON.stringify(snapshot))
        return remoteRevision;
      if (expectedRevision !== remoteRevision) throw { code: "40001" };
      remote = snapshot;
      remoteRevision += 1;
      if (lostResponse) {
        lostResponse = false;
        throw new Error("resposta perdida");
      }
      return remoteRevision;
    });
  const { result } = renderHook(useStudy);
  const initial = {
    ...createStudy({ name: "Ana", course: "TI", consent: true }),
    owner_id: "test",
  };
  await act(async () => result.current.setStudy(initial));
  await waitFor(() => expect(result.current.saveState).toBe("error"));
  const next = { ...initial, participant_name: "Ana atualizada" };
  await act(async () => result.current.setStudy(next));
  await waitFor(() => expect(result.current.saveState).toBe("saved"));
  expect(result.current.conflict).toBe(false);
  expect(remote).toEqual(next);
  expect(backend.save.mock.calls.map((call) => call[1])).toEqual([0, 0, 1]);
});
