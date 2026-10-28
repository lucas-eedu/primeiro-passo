# Primeiro Passo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** entregar um protótipo React testável, com coleta de evidências e configuração documentada para Vercel/Supabase.

**Architecture:** SPA estática com dados fictícios locais; lógica de tarefas e métricas independente da interface. Supabase Auth anônimo e RLS isolam os dados; login de equipe autoriza leitura e exportação.

**Tech Stack:** React, Vite, Supabase, Vitest, Testing Library, CSS.

## Execução

- [x] 1. Testar lógica: filtros combinados, transição somente com ação correta, duração e ajuda por tarefa, desistência, CSV protegido contra fórmulas e agregação sem inventar dados.
     Arquivos: tests/study.test.js, src/lib/study.js, src/lib/jobs.js. Executar `npm test` antes/depois.
- [x] 2. Implementar persistência, esquema SQL e autorização. Arquivos: src/lib/backend.js, src/lib/useStudy.js, supabase/schema.sql. Testar rejeição de erros e ausência de falso sucesso.
- [x] 3. Implementar interface responsiva, identificação, tarefas, filtros, detalhes, candidatura e feedback. Arquivos: src/App.jsx, src/components/Study.jsx, src/components/Modal.jsx, src/style.css. Teste de jornada completa e falha de salvamento em tests/app.test.jsx.
- [x] 4. Implementar área da equipe, gráficos CSS, tabelas e CSV. Arquivo: src/components/Admin.jsx. Testar acesso não autorizado e exportação.
- [x] 5. Verificar `npm test`, `npm run build`, teste no navegador se disponível. Documentar setup, métricas, procedimento de validação e limites.

## Registro

- Projeto inicial contém somente PDF; não há repositório Git nem implementação a preservar. Implementar na pasta autorizada, sem worktree/commits artificiais.
- Preferência expressa por Vercel sobrepõe o fluxo de publicação do plugin Sites.
- Publicação depende do acesso às contas e das variáveis do Supabase; preparar todo o projeto primeiro.

## Verificação e decisões finais

- Fluxo React completo, falhas de rede, serialização e retomada cobertos por testes.
- SQL executado no PostgreSQL local via PGlite: RLS, validações e concorrência verificadas.
- Revisão independente identificou busca sem resultados, JSON malformado e sobrescrita entre abas; corrigidos com testes de regressão.
- Prévia local respondeu HTTP 200; modal inicial e página de vagas inspecionados visualmente no Chrome. Jornada completa automatizada em jsdom; teste em dispositivo móvel físico não realizado.
- Supabase real e deploy Vercel ainda dependem de configuração nas contas do usuário; não foram criados serviços nem recursos pagos.
- Nenhuma sessão de demonstração foi usada como evidência de participante real.

- Reenvio preserva o snapshot sem confirmação antes de enviar novas alterações, inclusive após recarregar a página; cobre resposta perdida após COMMIT sem travar a única aba.
