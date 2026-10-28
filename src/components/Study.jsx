import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  CircleHelp,
  Clock3,
  ShieldCheck,
  Sprout,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import Modal from "./Modal";
import { TASKS, currentTask, taskNotUsed } from "../lib/study";
import { configured } from "../lib/backend";
export function Identification({ onBegin, onClose }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      await onBegin({
        name: data.get("name"),
        course: data.get("course"),
        consent: data.get("consent") === "on",
      });
    } catch {
      setError(
        "Não foi possível iniciar. Verifique a conexão e tente novamente. Se persistir, avise a equipe.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Antes do seu primeiro passo"
      onClose={busy ? undefined : onClose}
    >
      <div className="modal-symbol">
        <Sprout size={28} />
      </div>
      <span className="eyebrow">VAMOS CONSTRUIR JUNTOS</span>
      <h2>
        Antes do seu
        <br />
        primeiro passo.
      </h2>
      <p className="muted">
        Ajude a tornar a busca por estágio mais simples. São 3 tarefas rápidas e
        uma avaliação ao final.
      </p>
      <div className="inline-facts">
        <span>
          <Clock3 size={15} /> Cerca de 5 minutos
        </span>
        <span>
          <ShieldCheck size={15} /> Sem criar conta
        </span>
      </div>
      {!configured && (
        <p className="notice">
          Modo demonstração: você pode explorar o fluxo, mas os resultados não
          serão enviados à equipe.
        </p>
      )}
      <form onSubmit={submit}>
        <label>
          Nome ou apelido
          <input
            name="name"
            required
            maxLength={80}
            placeholder="Como podemos chamar você?"
            autoComplete="off"
          />
        </label>
        <label>
          Seu curso
          <input
            name="course"
            required
            maxLength={100}
            placeholder="Ex.: Ciência da Computação"
            autoComplete="off"
          />
        </label>
        <label className="consent">
          <input type="checkbox" name="consent" required />
          <span>
            Aceito participar deste teste acadêmico. Autorizo o registro do meu
            nome ou apelido, curso, ações, tempos e respostas para análise da
            equipe e apresentação ao professor.
          </span>
        </label>
        <p className="fine-print">
          A participação é voluntária. Você pode parar a qualquer momento. Para
          solicitar a exclusão dos registros, entre em contato com a equipe que
          enviou este link. Não coletamos currículo ou documentos.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="button full" disabled={busy}>
          {busy ? "Iniciando…" : "Começar minha participação"}
          <ArrowRight size={18} />
        </button>
        <p className="fine-print center">
          Você está avaliando a interface. Não estamos avaliando você.
        </p>
      </form>
    </Modal>
  );
}
function Timer({ startedAt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const seconds = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  return (
    <span className="timer">
      <Clock3 size={14} />
      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
    </span>
  );
}
export function TaskPanel({ study, onHelp, onSkip }) {
  const [hint, setHint] = useState(false);
  const i = currentTask(study);
  const task = study.tasks[i];
  useEffect(() => setHint(false), [i]);
  if (!task) return null;
  return (
    <section className="task-panel" aria-label="Roteiro do teste">
      <div className="task-heading">
        <span className="eyebrow">SEU ROTEIRO</span>
        <span className="muted">{i + 1} de 3 tarefas</span>
      </div>
      <div className="steps">
        {TASKS.map((t, n) => (
          <div
            key={t.id}
            className={`step ${n === i ? "current" : ""} ${["completed", "skipped"].includes(study.tasks[n].status) ? "done" : ""}`}
          >
            <span>
              {study.tasks[n].status === "completed" ? (
                <Check size={14} />
              ) : (
                n + 1
              )}
            </span>
            <p>
              {["Buscar", "Conhecer", "Candidatar"][n]}
              {study.tasks[n].status === "skipped" && (
                <small>
                  {taskNotUsed(study, n) ? "Não utilizada" : "Não concluída"}
                </small>
              )}
            </p>
          </div>
        ))}
      </div>
      <div className="task-body">
        <div className="task-number">0{i + 1}</div>
        <div>
          <h2>{TASKS[i].title}</h2>
          <p>{TASKS[i].instruction}</p>
        </div>
        {task.status === "active" && <Timer startedAt={task.started_at} />}
      </div>

      <div className="task-actions">
        <span className="active-label">
          <span />
          Avanço automático
        </span>
        <div className="button-row">
          <button
            className="text-button"
            onClick={() => {
              onHelp();
              setHint(true);
            }}
          >
            <CircleHelp size={16} />
            Preciso de ajuda
          </button>
          <button className="text-button muted" onClick={onSkip}>
            Não consegui concluir
          </button>
        </div>
      </div>
      {hint && (
        <p role="status" className="hint">
          {TASKS[i].hint} <small>Seu pedido de ajuda foi registrado.</small>
        </p>
      )}
    </section>
  );
}
export function SaveStatus({ state, onRetry, storageWarning, conflict }) {
  return (
    <div className="save-status" aria-live="polite">
      {state === "saving" && <span>Salvando progresso…</span>}
      {state === "saved" && (
        <span>
          <CheckCircle2 size={14} />
          Progresso salvo
        </span>
      )}
      {state === "demo" && (
        <span>Exploração em modo demonstração · sem envio de dados</span>
      )}
      {conflict && (
        <p className="error" role="alert">
          Esta participação foi alterada em outra aba. Para evitar sobrescrever
          os resultados, continue apenas na aba mais recente. Esta aba não
          enviará novas alterações.
        </p>
      )}
      {state === "error" && !conflict && (
        <div className="error" role="alert">
          Não foi possível salvar. Mantenha esta página aberta e tente
          novamente.
          <button className="text-button" onClick={onRetry}>
            <RotateCcw size={15} />
            Tentar salvar novamente
          </button>
        </div>
      )}
      {storageWarning && (
        <p className="error">
          Este navegador não permite guardar um rascunho. Evite atualizar a
          página.
        </p>
      )}
    </div>
  );
}
export function Feedback({ onSubmit }) {
  const [ease, setEase] = useState("");
  const [error, setError] = useState("");
  function submit(e) {
    e.preventDefault();
    try {
      onSubmit({ ease, comment: new FormData(e.currentTarget).get("comment") });
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <section className="feedback-card">
      <div className="modal-symbol">
        <CheckCircle2 size={28} />
      </div>
      <span className="eyebrow">FALTA SÓ SUA OPINIÃO</span>
      <h1>
        Como foi dar
        <br />
        esse primeiro passo?
      </h1>
      <p className="muted">
        As tarefas terminaram. Conte o que funcionou e o que pode melhorar.
      </p>
      <form onSubmit={submit}>
        <fieldset>
          <legend>Foi fácil usar o protótipo?</legend>
          <div className="rating">
            {[
              "Muito difícil",
              "Difícil",
              "Razoável",
              "Fácil",
              "Muito fácil",
            ].map((label, i) => (
              <label
                key={label}
                className={ease === String(i + 1) ? "selected" : ""}
              >
                <input
                  type="radio"
                  name="ease"
                  value={i + 1}
                  checked={ease === String(i + 1)}
                  onChange={(e) => setEase(e.target.value)}
                  required
                  aria-label={`${i + 1} — ${label}`}
                />
                <strong>{i + 1}</strong>
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label>
          O que podemos melhorar? <span className="muted">(opcional)</span>
          <textarea
            name="comment"
            rows={4}
            maxLength={1500}
            placeholder="Algo te confundiu? Sentiu falta de alguma informação?"
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="button full">
          Enviar avaliação
          <ArrowRight size={18} />
        </button>
      </form>
    </section>
  );
}
export function Finished({ study, saveState, onReset }) {
  const saved = saveState === "saved";
  const demo = saveState === "demo";
  const [error, setError] = useState("");
  return (
    <section className="feedback-card center">
      <div className="celebration">
        <Check size={40} />
      </div>
      <span className="eyebrow">OBRIGADO PELO SEU TEMPO</span>
      <h1>
        {saved
          ? "Participação registrada!"
          : demo
            ? "Demonstração concluída!"
            : "Falta salvar sua avaliação."}
      </h1>
      <p className="muted">
        {saved
          ? `${study.participant_name}, sua experiência vai ajudar a equipe a melhorar a busca por estágio.`
          : demo
            ? "Você percorreu o protótipo. Nenhum resultado foi enviado para a pesquisa."
            : "Sua avaliação está nesta página. Aguarde o envio ou use a opção de tentar novamente."}
      </p>
      {saved && (
        <p className="receipt">
          Código da participação
          <br />
          <strong>{study.id.slice(0, 8).toUpperCase()}</strong>
          <small>Guarde este código se precisar falar com a equipe.</small>
        </p>
      )}
      {(saved || demo) && (
        <>
          <p className="fine-print">Você já pode fechar esta página.</p>
          <button
            className="button secondary"
            onClick={async () => {
              try {
                await onReset();
              } catch {
                setError(
                  "Não foi possível encerrar a sessão. Tente novamente.",
                );
              }
            }}
          >
            Encerrar e voltar ao início
            <ArrowRight size={17} />
          </button>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
