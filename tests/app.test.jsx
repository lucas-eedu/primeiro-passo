import React from "react";
import { it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.jsx";
vi.mock("../src/lib/backend.js", () => ({
  configured: true,
  backend: {
    begin: vi.fn(async () => "owner-1"),
    save: vi.fn(async (_s, revision) => revision + 1),
    end: vi.fn(async () => {}),
    login: vi.fn(),
    results: vi.fn(),
    logout: vi.fn(),
  },
}));
import { backend } from "../src/lib/backend.js";
async function begin(user) {
  await user.type(screen.getByLabelText("Nome ou apelido"), "Ana");
  await user.type(screen.getByLabelText("Seu curso"), "Ciência da Computação");
  await user.click(screen.getByRole("checkbox"));
  await user.click(
    screen.getByRole("button", { name: "Começar minha participação" }),
  );
  await screen.findByRole("button", { name: "Iniciar tarefa 1" });
}
it("percorre as três tarefas e confirma somente após salvar o feedback", async () => {
  const user = userEvent.setup();
  render(<App />);
  await begin(user);
  await user.click(screen.getByRole("button", { name: "Iniciar tarefa 1" }));
  await user.selectOptions(
    screen.getByLabelText("Área do estágio"),
    "Tecnologia",
  );
  await user.selectOptions(screen.getByLabelText("Turno"), "Manhã");
  await user.click(screen.getByRole("button", { name: "Buscar vagas" }));
  await user.click(screen.getByRole("button", { name: "Iniciar tarefa 2" }));
  await user.click(
    screen.getByRole("button", {
      name: "Ver vaga: Estágio em Desenvolvimento Web",
    }),
  );
  await user.click(screen.getByRole("button", { name: "Fechar detalhes" }));
  await user.click(screen.getByRole("button", { name: "Iniciar tarefa 3" }));
  await user.click(
    screen.getByRole("button", {
      name: "Ver vaga: Estágio em Desenvolvimento Web",
    }),
  );
  await user.click(screen.getByRole("button", { name: "Simular candidatura" }));
  await user.click(
    screen.getByRole("button", { name: "Confirmar candidatura simulada" }),
  );
  await user.click(screen.getByLabelText("5 — Muito fácil"));
  await user.click(screen.getByRole("button", { name: "Enviar avaliação" }));
  expect(
    await screen.findByText("Participação registrada!"),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(backend.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: "completed",
        feedback: expect.objectContaining({ ease: 5 }),
      }),
      expect.any(Number),
    ),
  );
});
it("falha de rede não é exibida como participação registrada", async () => {
  backend.save.mockRejectedValue(new Error("offline"));
  const user = userEvent.setup();
  render(<App />);
  await begin(user);
  expect(
    await screen.findByText(/Não foi possível salvar/),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("Participação registrada!"),
  ).not.toBeInTheDocument();
  backend.save.mockImplementation(async (_s, revision) => revision + 1);
  await user.click(
    screen.getByRole("button", { name: "Tentar salvar novamente" }),
  );
  expect(await screen.findByText("Progresso salvo")).toBeInTheDocument();
});
it("impede que conta sem permissão veja resultados", async () => {
  backend.login.mockRejectedValue(new Error("Conta sem acesso à equipe."));
  window.location.hash = "#equipe";
  const user = userEvent.setup();
  render(<App />);
  await user.type(screen.getByLabelText("E-mail"), "teste@example.com");
  await user.type(screen.getByLabelText("Senha"), "12345678");
  await user.click(
    screen.getByRole("button", { name: "Entrar na área da equipe" }),
  );
  expect(
    await screen.findByText("Conta sem acesso à equipe."),
  ).toBeInTheDocument();
  expect(backend.results).not.toHaveBeenCalled();
  window.location.hash = "";
});
