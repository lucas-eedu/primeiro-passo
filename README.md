# Primeiro Passo

Protótipo acadêmico de busca de estágios para F108 — Desenvolvimento de Projeto Aplicado. React + Vite, pronto para Vercel, com Supabase para os registros dos testes. Todas as vagas e candidaturas são fictícias.

## Rodar agora

Requer Node.js 22.12+ (verificado com Node 24).

```sh
npm ci
npm run dev
```

Abra a URL exibida no terminal, normalmente http://127.0.0.1:5173. Sem variáveis do Supabase, a aplicação funciona em **modo demonstração**, sem enviar registros. Depois de configurar o banco, `/?demo=1` continua disponível para ensaios da equipe sem contaminar os resultados reais.

## O que está pronto

- Identificação por nome/apelido e curso, com consentimento explícito.
- Três tarefas guiadas: encontrar vagas de Tecnologia pela Manhã, abrir a vaga de Desenvolvimento Web da Nexo Digital e simular candidatura.
- Tempo por tarefa, sucesso, desistência, pedidos de ajuda e sequência de ações.
- Avaliação de facilidade de 1 a 5 e comentário opcional.
- Salvamento central, indicação de falhas, reenvio e rascunho para atualização da página na mesma aba.
- Controle de revisão no banco: uma aba antiga não sobrescreve a participação mais recente.
- Área da equipe em `/#equipe`, com login, gráficos e CSV. CSV inclui sessões incompletas e eventos, com proteção contra fórmulas.
- Layout para desktop e celular, formulários rotulados, diálogo nativo e foco visível.

## Configurar o Supabase

1. Crie um projeto dedicado no Supabase. Escolha um plano gratuito disponível; não é necessário contratar recursos pagos para este escopo, mas confira os limites da conta antes da coleta.
2. No SQL Editor, execute o conteúdo de `supabase/schema.sql` **uma vez, em um projeto novo**. O script cria tabelas, validações, políticas RLS e a função de salvamento. Não remova as políticas.
3. Em Authentication, habilite **Anonymous Sign-Ins** e mantenha a criação de usuários habilitada. O participante recebe uma identidade técnica anônima, sem preencher e-mail/senha. O nome/apelido informado continua sendo um dado da pesquisa.
4. Copie a URL do projeto e a **publishable key** (ou a chave pública legada `anon`). Não use `service_role`, secret key ou senha do banco no frontend.
5. Copie `.env.example` para `.env.local` e preencha:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE_PUBLICA
```

6. Reinicie `npm run dev`. A faixa de demonstração deve desaparecer. Um projeto preenchido incorretamente exibe erro de início/salvamento; não há fallback silencioso para dados locais.
7. Para a equipe, crie um usuário de e-mail/senha no painel Authentication → Users. Em seguida, autorize esse usuário pelo SQL Editor, substituindo o e-mail abaixo:

```sql
insert into public.team_members (user_id)
select id from auth.users where email = 'seu-email@exemplo.com'
on conflict do nothing;
```

8. Acesse `/#equipe` e entre com a conta criada. Contas sem registro em `team_members` não acessam os resultados. Participantes não podem conceder esse acesso a si mesmos.

A autenticação anônima tem limites por IP. Antes de reunir participantes no mesmo Wi-Fi, confira os limites atuais em Authentication → Rate Limits. Não aumente limites nem contrate planos automaticamente. Em caso de bloqueio, aguarde a janela de limite e retome a coleta. Para distribuição ampla na internet, avalie a proteção contra abuso disponibilizada pelo Supabase; este MVP foi pensado para uma coleta pequena e acompanhada.

## Publicar na Vercel

1. Coloque o código em um repositório privado no GitHub (não inclua `.env.local`, CSVs nem dados de participantes).
2. Importe o repositório na Vercel. O `vercel.json` já define Vite, `npm run build` e saída `dist`.
3. Cadastre as duas variáveis `VITE_SUPABASE_*` nas configurações de ambiente do projeto. São valores públicos para o cliente; o controle de acesso é feito por Auth/RLS.
4. Faça o deploy. Mudanças nessas variáveis exigem novo build/deploy.
5. Confira um teste completo no link publicado e o registro correspondente na área da equipe antes de convidar participantes. Identifique esse ensaio no controle da equipe para não contar como usuário da pesquisa.

Alternativa pelo terminal, após configurar e autenticar sua própria conta:

```sh
npx vercel
```

Nenhuma conta, projeto hospedado ou recurso pago foi criado automaticamente. A conexão ao Supabase real e a publicação dependem dessas configurações.

## Como coletar as evidências

- Recrute pelo menos 10 universitários do público-alvo, conforme o enunciado. Não use os testes automatizados deste projeto como evidência de usuários reais.
- Envie o link normal, **sem `?demo=1`**. Explique que o teste avalia a interface, não a pessoa.
- Peça que cada pessoa use uma única aba e leia as tarefas antes de iniciar. O cronômetro começa no botão “Iniciar tarefa”.
- Observe dificuldades sem orientar antecipadamente. Se ajudar, peça que use “Preciso de ajuda”, para o pedido ficar registrado. “Não consegui concluir” encerra a tarefa como desistência.
- Aguarde “Participação registrada!” ao final. Se houver falha, mantenha a aba aberta e use “Tentar salvar novamente”. A confirmação só aparece após o servidor confirmar a última versão.
- Em dispositivo compartilhado, use “Encerrar e voltar ao início” entre participantes.
- No painel, atualize e exporte o CSV. Registre observações e recolha prints/fotos autorizados das sessões; o aplicativo não grava câmera, áudio ou tela.
- Para o trabalho, reúna pelo menos 5 evidências e gráficos, além do parecer da equipe, conforme o PDF. Use códigos/apelidos para não expor nomes em materiais compartilhados.

## Definição das métricas

| Métrica                 | Cálculo e interpretação                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Participações iniciadas | Quantidade de sessões salvas; identificação autodeclarada, não prova pessoas únicas.                                                       |
| Avaliações enviadas     | Sessões com as três tarefas encerradas e avaliação final salva. Não significa sucesso em todas as tarefas.                                 |
| Sucesso por tarefa      | Tarefas concluídas ÷ tarefas iniciadas. Inclui desistências e tarefas ainda ativas no denominador.                                         |
| Tempo médio por tarefa  | Média do tempo decorrido das tarefas encerradas, tanto concluídas quanto desistidas. Inclui pausas, atualizações da página e troca de aba. |
| Pedidos de ajuda        | Total de acionamentos do botão durante cada tarefa.                                                                                        |
| Facilidade percebida    | Média das notas 1–5 entre as avaliações finais enviadas.                                                                                   |

O objetivo é medir usabilidade, não empregabilidade. Métricas vazias são mostradas como “—”. Como a coleta ocorre no navegador, os tempos e a identidade não são prova antifraude; combine os registros com observações reais. O histórico guarda até 500 eventos por sessão.

## Privacidade e limites

RLS restringe cada participante à própria linha; membros autorizados da equipe podem ler as sessões. O navegador só usa chave pública. Contas e registros reais não estão incluídos no repositório. Rascunhos e autenticação ficam na sessão da aba; fechar a aba pode perder alterações que não chegaram ao servidor. Não há upload de currículo, mensagens, oportunidades reais ou integração com empresas.

Em caso de conflito entre abas, a aba desatualizada para de salvar e mostra um aviso. Continue na aba mais recente; não tente realizar a mesma participação em duas abas.

Combine com a equipe um período de retenção após a avaliação da disciplina. Exclusões solicitadas pelos participantes devem ser feitas por um responsável no painel do Supabase, usando o código da participação; excluir o usuário anônimo também remove a sessão por cascata. A interface não oferece exclusão pública.

## Verificação técnica

```sh
npm test
npm run build
```

A suíte cobre a jornada React, filtros, tempos, desistência, ajuda, CSV, falha de rede, persistência e concorrência. As políticas SQL são executadas em PostgreSQL local via PGlite, incluindo isolamento entre usuários, acesso da equipe, rejeição de dados malformados e controle de revisão. Isso não substitui o teste final no Supabase real e no domínio publicado.

Referências oficiais: [Vite](https://vite.dev/guide/), [Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite), [autenticação anônima do Supabase](https://supabase.com/docs/guides/auth/auth-anonymous) e [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
