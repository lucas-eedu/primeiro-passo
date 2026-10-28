import { useState } from "react";
import {
  Download,
  LogOut,
  RefreshCw,
  LockKeyhole,
  Users,
  CheckCircle2,
  Star,
  ArrowRight,
} from "lucide-react";
import { backend, configured } from "../lib/backend";
import { summarize, toCsv, taskNotUsed } from "../lib/study";
const statusLabel = {
  completed: "Concluído",
  in_progress: "Em andamento",
  pending: "Não iniciada",
  active: "Em andamento",
  skipped: "Não concluída",
};
export default function Admin() {
  const [authorized, setAuthorized] = useState(false);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      setRows(await backend.results());
    } catch {
      setError(
        "Não foi possível carregar os resultados. Tente atualizar novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function login(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await backend.login(data.get("email"), data.get("password"));
      setAuthorized(true);
      setRows(await backend.results());
    } catch (e) {
      setError(
        e.message === "Conta sem acesso à equipe."
          ? e.message
          : "Não foi possível entrar ou carregar os dados. Confira as credenciais e a conexão.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await backend.logout();
      setRows([]);
      setAuthorized(false);
    } catch {
      setError("Não foi possível sair. Tente novamente.");
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `primeiro-passo-resultados-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!authorized)
    return (
      <section className="login-card">
        <div className="modal-symbol">
          <LockKeyhole size={26} />
        </div>
        <span className="eyebrow">ESPAÇO DA EQUIPE</span>
        <h1>
          Da experiência
          <br />
          ao aprendizado.
        </h1>
        <p className="muted">
          Acesse os registros dos testes e acompanhe os resultados da pesquisa.
        </p>
        {!configured ? (
          <p className="notice">
            O protótipo está em modo demonstração. Configure o Supabase para
            habilitar o acesso aos resultados reais. As instruções estão no
            README do projeto.
          </p>
        ) : (
          <form onSubmit={login}>
            <label>
              E-mail
              <input
                type="email"
                name="email"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Senha
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="button full" disabled={busy}>
              {busy ? "Entrando…" : "Entrar na área da equipe"}
              <ArrowRight size={18} />
            </button>
          </form>
        )}
        <a className="text-button" href="#">
          Voltar ao protótipo
        </a>
      </section>
    );
  const stats = summarize(rows);
  return (
    <section className="dashboard">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ESPAÇO DA EQUIPE</span>
          <h1>O que estamos aprendendo.</h1>
          <p className="muted">
            Resultados reais das participações registradas.
          </p>
        </div>
        <div className="button-row">
          <button
            className="button secondary"
            disabled={busy}
            onClick={refresh}
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
          <button className="text-button" onClick={logout}>
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="stat-grid">
        {[
          [Users, "Participações iniciadas", stats.total],
          [CheckCircle2, "Avaliações enviadas", stats.finished],
          [
            Star,
            "Facilidade percebida",
            stats.averageEase == null
              ? "—"
              : `${stats.averageEase.toFixed(1)} / 5`,
          ],
        ].map(([Icon, label, value]) => (
          <article className="stat-card" key={label}>
            <Icon size={21} />
            <p>{label}</p>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="data-panel">
        <div className="section-heading">
          <div>
            <h2>Conclusão das tarefas</h2>
            <p className="muted">
              Sucessos divididos pelas tentativas iniciadas, incluindo
              desistências e tarefas em andamento. Etapas não utilizadas são
              contabilizadas separadamente.
            </p>
          </div>
        </div>
        {stats.tasks.map((t, i) => (
          <div className="metric-row" key={t.id}>
            <div>
              <strong>
                0{i + 1} · {t.title}
              </strong>
              <span>
                {t.completed} de {t.attempts} tentativas · {t.notUsedCount} não
                utilizadas · {t.helpCount} pedidos de ajuda ·{" "}
                {t.averageSeconds == null
                  ? "sem tempo registrado"
                  : `${t.averageSeconds.toFixed(0)}s em média nas tarefas encerradas`}
              </span>
            </div>
            <div
              className="bar"
              role="img"
              aria-label={`${t.title}: ${t.successRate == null ? "sem tentativas" : t.successRate.toFixed(0) + "% de conclusão"}`}
            >
              <span style={{ width: `${t.successRate || 0}%` }} />
            </div>
            <strong>
              {t.successRate == null ? "—" : `${t.successRate.toFixed(0)}%`}
            </strong>
          </div>
        ))}
      </section>
      <section className="data-panel">
        <div className="section-heading">
          <div>
            <h2>Registros da pesquisa</h2>
            <p className="muted">
              Inclui sessões incompletas. A identificação é autodeclarada.
            </p>
          </div>
          <button
            className="button"
            onClick={download}
            disabled={!rows.length || busy}
          >
            <Download size={17} />
            Exportar CSV
          </button>
        </div>
        {!rows.length ? (
          <div className="empty-state">
            <Users size={28} />
            <h3>A pesquisa começa com a primeira pessoa.</h3>
            <p>Nenhuma participação registrada até agora.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Participante</th>
                  <th>Início</th>
                  <th>Situação</th>
                  <th>Tarefas</th>
                  <th>Facilidade</th>
                  <th>Comentário</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.participant_name}</strong>
                      <small>{r.course}</small>
                      <code>{r.id.slice(0, 8).toUpperCase()}</code>
                    </td>
                    <td>{new Date(r.started_at).toLocaleString("pt-BR")}</td>
                    <td>
                      <span
                        className={`status-tag ${r.status === "completed" ? "finished" : ""}`}
                      >
                        {statusLabel[r.status]}
                      </span>
                    </td>
                    <td>
                      {r.tasks.map((t, i) => (
                        <small key={t.id}>
                          {i + 1}:{" "}
                          {taskNotUsed(r, i)
                            ? "Não utilizada"
                            : statusLabel[t.status]}
                          {t.duration_ms != null
                            ? ` · ${(t.duration_ms / 1000).toFixed(0)}s`
                            : ""}
                        </small>
                      ))}
                    </td>
                    <td>{r.feedback?.ease ? `${r.feedback.ease}/5` : "—"}</td>
                    <td className="comment-cell">
                      {r.feedback?.comment || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="fine-print">
        Os tempos incluem pausas e mudanças de aba. Participações não equivalem
        necessariamente a pessoas únicas. Use os registros junto às observações
        das sessões, às evidências autorizadas e à análise da equipe. Não
        publique dados identificáveis no relatório compartilhado.
      </p>
    </section>
  );
}
