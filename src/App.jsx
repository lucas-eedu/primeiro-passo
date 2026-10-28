import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  MapPin,
  Clock3,
  BriefcaseBusiness,
  SlidersHorizontal,
  GraduationCap,
  Check,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { jobs, areas } from "./lib/jobs";
import {
  TASKS,
  createStudy,
  currentTask,
  startTask,
  recordAction,
  finishTask,
  finishStudy,
  filterJobs,
} from "./lib/study";
import { backend, configured } from "./lib/backend";
import { useStudy } from "./lib/useStudy";
import {
  Identification,
  TaskPanel,
  SaveStatus,
  Feedback,
  Finished,
} from "./components/Study";
import Modal from "./components/Modal";
import Admin from "./components/Admin";
const emptyFilters = { search: "", area: "", shift: "" };
const currency = (n) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
export default function App() {
  const [route, setRoute] = useState(window.location.hash);
  const {
    study,
    setStudy,
    saveState,
    retrySave,
    reset,
    storageWarning,
    conflict,
  } = useStudy();
  const [identify, setIdentify] = useState(!study);
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const handler = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  const team = route === "#equipe";
  const taskIndex = study ? currentTask(study) : -1;
  function action(type, payload) {
    if (study) setStudy((s) => recordAction(s, type, payload));
  }
  async function begin(person) {
    const next = createStudy(person);
    next.owner_id = await backend.begin();
    setStudy(next);
    setIdentify(false);
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setNotice("");
  }
  async function restart() {
    await reset();
    setIdentify(true);
    setSelected(null);
    setNotice("");
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }
  function search(e) {
    e.preventDefault();
    setAppliedFilters(filters);
    action("filter", {
      area: filters.area,
      shift: filters.shift,
      search: filters.search,
    });
  }
  function open(job) {
    setSelected(job);
    setConfirming(false);
    action("view", { jobId: job.id });
  }
  function apply() {
    action("apply", { jobId: selected.id });
    setNotice(
      "Candidatura simulada! Nenhuma informação foi enviada a uma empresa.",
    );
    setSelected(null);
    setConfirming(false);
  }
  const visible = filterJobs(jobs, appliedFilters);
  const canApply = !study || taskIndex === 2;
  const startsApplicationTask =
    taskIndex === 2 && study.tasks[2].status === "pending";
  function beginApplication() {
    if (startsApplicationTask) setStudy((s) => startTask(s));
    setConfirming(true);
  }
  return (
    <>
      {!configured && (
        <div className="demo-banner">
          <span>PRÉVIA DO PROJETO</span> Modo demonstração · os dados não são
          enviados à equipe
        </div>
      )}
      <header className="site-header">
        <div className="container header-inner">
          <a href="#" className="brand" aria-label="Primeiro Passo, início">
            <span className="brand-icon">
              <ArrowUpRight size={27} />
            </span>
            <span>
              primeiro<span className="brand-light">passo</span>
              <small>OPORTUNIDADES QUE TRANSFORMAM</small>
            </span>
          </a>
          <nav aria-label="Navegação principal">
            <a className={!team ? "nav-active" : ""} href="#">
              Encontrar estágio
            </a>
            <a className={team ? "nav-active" : ""} href="#equipe">
              Área da equipe
              <ArrowUpRight size={14} />
            </a>
          </nav>
        </div>
      </header>
      <main className="container">
        {team ? (
          <Admin />
        ) : (
          <>
            {(!study || taskIndex >= 0) && (
              <>
                <section className={`hero ${study ? "hero-compact" : ""}`}>
                  <div className="hero-copy">
                    <span className="eyebrow">
                      <span className="tiny-dot" />
                      SEU TALENTO TEM LUGAR
                    </span>
                    <h1>
                      Seu futuro começa
                      <br />
                      com um <span>primeiro passo.</span>
                    </h1>
                    <p>
                      Encontre um estágio que combine com sua área,
                      <br className="desktop-break" /> sua rotina e o que você
                      quer construir.
                    </p>
                    {!study && (
                      <button
                        className="button"
                        onClick={() => setIdentify(true)}
                      >
                        Participar do teste
                        <ArrowRight size={18} />
                      </button>
                    )}
                    {study && (
                      <p className="welcome">
                        Olá, <strong>{study.participant_name}</strong>. Vamos
                        explorar as oportunidades?
                      </p>
                    )}
                  </div>
                  <div className="hero-art" aria-hidden="true">
                    <div className="art-orbit" />
                    <div className="art-spark">✳</div>
                    <div className="art-card">
                      <div className="art-icon">
                        <GraduationCap size={31} />
                      </div>
                      <span>O próximo capítulo</span>
                      <strong>começa com você.</strong>
                      <div className="art-line" />
                      <div className="art-line short" />
                      <div className="art-check">
                        <Check size={14} /> Um passo de cada vez
                      </div>
                    </div>
                    <div className="art-badge">
                      <ArrowUpRight size={28} />
                    </div>
                  </div>
                </section>
                {study && (
                  <TaskPanel
                    study={study}
                    onStart={() => {
                      setFilters(emptyFilters);
                      setAppliedFilters(emptyFilters);
                      setNotice("");
                      setStudy((s) => startTask(s));
                    }}
                    onHelp={() => action("help", {})}
                    onSkip={() => setStudy((s) => finishTask(s, "skipped"))}
                  />
                )}
                <section
                  className="opportunities"
                  aria-labelledby="opportunities-heading"
                >
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">EXPLORE AS POSSIBILIDADES</span>
                      <h2 id="opportunities-heading">
                        Uma oportunidade com a sua cara.
                      </h2>
                    </div>
                    <span className="fiction-label">
                      <BriefcaseBusiness size={14} /> Vagas de demonstração
                    </span>
                  </div>
                  <form className="filters" onSubmit={search}>
                    <label className="search-field">
                      <span>O que você procura?</span>
                      <div className="input-icon">
                        <Search size={18} />
                        <input
                          aria-label="Buscar por vaga ou empresa"
                          placeholder="Cargo, empresa ou palavra-chave"
                          value={filters.search}
                          onChange={(e) =>
                            setFilters({ ...filters, search: e.target.value })
                          }
                        />
                      </div>
                    </label>
                    <label>
                      Área do estágio
                      <select
                        value={filters.area}
                        onChange={(e) =>
                          setFilters({ ...filters, area: e.target.value })
                        }
                      >
                        <option value="">Todas as áreas</option>
                        {areas.map((a) => (
                          <option key={a}>{a}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Turno
                      <select
                        value={filters.shift}
                        onChange={(e) =>
                          setFilters({ ...filters, shift: e.target.value })
                        }
                      >
                        <option value="">Todos os turnos</option>
                        <option>Manhã</option>
                        <option>Tarde</option>
                      </select>
                    </label>
                    <button className="button">
                      <SlidersHorizontal size={17} />
                      Buscar vagas
                    </button>
                  </form>
                  <div className="results-heading">
                    <p aria-live="polite">
                      <strong>{visible.length}</strong>{" "}
                      {visible.length === 1
                        ? "oportunidade encontrada"
                        : "oportunidades encontradas"}
                    </p>
                    <span>Um começo cheio de possibilidades</span>
                    {Object.values(appliedFilters).some(Boolean) && (
                      <button
                        className="text-button"
                        onClick={() => {
                          setFilters(emptyFilters);
                          setAppliedFilters(emptyFilters);
                        }}
                      >
                        Limpar filtros
                      </button>
                    )}
                  </div>
                  {visible.length ? (
                    <div className="jobs-grid">
                      {visible.map((job) => (
                        <article key={job.id} className="job-card">
                          <div className="job-top">
                            <div className={`company-avatar ${job.color}`}>
                              {job.initials}
                            </div>
                            <span className="mode">{job.mode}</span>
                          </div>
                          <p className="company">{job.company}</p>
                          <h3>{job.title}</h3>
                          <div className="job-meta">
                            <span>
                              <MapPin size={15} />
                              {job.location}
                            </span>
                            <span>
                              <Clock3 size={15} />
                              {job.shift} · {job.hours}
                            </span>
                          </div>
                          <div className="tags">
                            {job.tags.map((t) => (
                              <span key={t}>{t}</span>
                            ))}
                          </div>
                          <div className="job-bottom">
                            <p>
                              <strong>{currency(job.salary)}</strong>
                              <span> / mês</span>
                            </p>
                            <button
                              onClick={() => open(job)}
                              aria-label={`Ver vaga: ${job.title}`}
                            >
                              Ver oportunidade
                              <ArrowUpRight size={17} />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <Search size={30} />
                      <h3>Nenhuma vaga por aqui, ainda.</h3>
                      <p>Tente outra área, turno ou palavra-chave.</p>
                      <button
                        className="button secondary"
                        onClick={() => {
                          setFilters(emptyFilters);
                          setAppliedFilters(emptyFilters);
                        }}
                      >
                        Ver todas as vagas
                      </button>
                    </div>
                  )}
                </section>
                <aside className="purpose">
                  <div className="purpose-icon">
                    <SproutIcon />
                  </div>
                  <div>
                    <span className="eyebrow">
                      PEQUENOS PASSOS, NOVAS POSSIBILIDADES
                    </span>
                    <h3>Mais acesso ao primeiro estágio.</h3>
                    <p>
                      Um projeto acadêmico sobre inclusão produtiva e
                      oportunidades para universitários.
                    </p>
                  </div>
                  <span className="ods">
                    ODS <strong>08</strong>
                    <small>
                      Trabalho decente e<br />
                      crescimento econômico
                    </small>
                  </span>
                </aside>
              </>
            )}
            {study && taskIndex < 0 && study.status !== "completed" && (
              <Feedback
                onSubmit={(feedback) =>
                  setStudy((s) => finishStudy(s, feedback))
                }
              />
            )}
            {study?.status === "completed" && (
              <Finished study={study} saveState={saveState} onReset={restart} />
            )}
            {notice && (
              <p className="success-notice" role="status">
                <Check size={17} />
                {notice}
              </p>
            )}
            {study && (
              <SaveStatus
                state={saveState}
                onRetry={retrySave}
                storageWarning={storageWarning}
                conflict={conflict}
              />
            )}
          </>
        )}
      </main>
      <footer className="container footer">
        <span>
          primeiropasso<span className="muted"> · Projeto acadêmico F108</span>
        </span>
        <p>Vagas fictícias. Candidaturas apenas simuladas.</p>
      </footer>
      {identify && !study && !team && (
        <Identification onBegin={begin} onClose={() => setIdentify(false)} />
      )}
      {selected && !team && (
        <Modal
          title={confirming ? "Confirmar candidatura" : selected.title}
          wide
          onClose={() => setSelected(null)}
          closeLabel="Fechar detalhes"
        >
          {confirming ? (
            <div className="confirmation">
              <div className="modal-symbol">
                <BriefcaseBusiness size={28} />
              </div>
              <span className="eyebrow">SÓ MAIS UM PASSO</span>
              <h2>Vamos simular sua candidatura?</h2>
              <p>
                Você escolheu <strong>{selected.title}</strong>, na{" "}
                {selected.company}.
              </p>
              <p className="notice">
                Esta é uma simulação acadêmica. Não haverá envio de currículo
                nem contato com empresas.
              </p>
              <button className="button full" onClick={apply}>
                Confirmar candidatura simulada
                <Check size={18} />
              </button>
              <button
                className="text-button"
                onClick={() => setConfirming(false)}
              >
                <ArrowLeft size={16} />
                Voltar aos detalhes
              </button>
            </div>
          ) : (
            <>
              <div className={`company-avatar large ${selected.color}`}>
                {selected.initials}
              </div>
              <p className="company">{selected.company} · Vaga fictícia</p>
              <h2>{selected.title}</h2>
              <div className="detail-meta">
                <span>
                  <MapPin size={16} />
                  {selected.location} · {selected.mode}
                </span>
                <span>
                  <Clock3 size={16} />
                  {selected.shift} · {selected.hours}
                </span>
                <strong>{currency(selected.salary)} / mês</strong>
              </div>
              <p className="description">{selected.description}</p>
              {[
                ["O que você vai fazer", selected.activities],
                ["O que você precisa", selected.requirements],
                ["Para apoiar seu começo", selected.benefits],
              ].map(([heading, items]) => (
                <section className="detail-section" key={heading}>
                  <h3>{heading}</h3>
                  <ul>
                    {items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
              {startsApplicationTask && (
                <div className="notice">
                  <strong>Próxima etapa: tarefa 3</strong>
                  <p>{TASKS[2].instruction}</p>
                  <span>O tempo começa ao clicar no botão abaixo.</span>
                </div>
              )}
              {canApply ? (
                <button className="button full" onClick={beginApplication}>
                  {startsApplicationTask
                    ? "Iniciar tarefa 3 e simular candidatura"
                    : "Simular candidatura"}
                  <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  className="button full"
                  onClick={() => setSelected(null)}
                >
                  Voltar à tarefa {taskIndex + 1}
                  <ArrowLeft size={18} />
                </button>
              )}
              <button className="text-button" onClick={() => setSelected(null)}>
                <ArrowLeft size={16} />
                Voltar às vagas
              </button>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
function SproutIcon() {
  return <Sparkles size={26} />;
}
