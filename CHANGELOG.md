# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2026-03-21

### Fase 1: Infraestrutura e Configuração

- Inicialização do repositório Git com estrutura de pastas (`frontend/`, `backend/`, `docs/`)
- Configuração do projeto Angular 17+ com POUI
- Configuração do ambiente de desenvolvimento TLPP com estrutura de pastas (`controllers`, `services`, `helpers`, `models`, `middleware`)
- Scripts SQL de criação das tabelas de persistência: `PQHIST`, `PQFAVS`, `PQAUDT`
- Pipeline de build do Angular com environments de development e production
- Configuração de logging estruturado

### Fase 2: Backend TLPP Camada de Dados

- `ConnectionHelper` — gerenciamento de conexões via `MsConnect`/`MsDisconnect` com aliases (default, oracle, postgres)
- `SqlDialectHelper` — normalização de dialetos SQL (TOP/FETCH FIRST/LIMIT) via `TCGenQry`
- `ResultSetHelper` — serialização de cursor para JSON com metadados de colunas e linhas
- Models de Request/Response: `QueryRequest`, `QueryResult`
- Models de Persistência: `HistoryRecord`, `FavoriteRecord`
- `LoggerHelper` — logging estruturado de execuções
- `SchemaService` — listagem de tabelas e colunas via `RetSqlName`

### Fase 3: Backend TLPP API REST

- `QueryController` — endpoint para execução de queries SQL (SELECT, DML, DDL)
- `HistoryController` — CRUD de histórico de execuções (últimas 200 queries por usuário)
- `FavoriteController` — CRUD de queries favoritas com nome e descrição
- `ExportController` — exportação de resultados em XLSX e CSV
- `SchemaController` — endpoints para metadados de tabelas e colunas
- `QueryService` — orquestração de execução com validação de SQL
- `HistoryService` — persistência e recuperação do histórico em `PQHIST`
- `FavoriteService` — persistência e recuperação de favoritos em `PQFAVS`
- `ExportService` — geração de arquivos de exportação
- `AuthMiddleware` — autenticação JWT via token Protheus
- `AuditMiddleware` — auditoria completa de operações em `PQAUDT`
- `RateLimitMiddleware` — rate limiting (60 req/min por usuário)
- `ValidationHelper` — validação e sanitização de SQL para bloqueio de comandos perigosos

### Fase 4: Frontend Estrutura e Autenticação

- Configuração do módulo Angular com routing e lazy loading
- Integração do POUI como framework de UI
- `AuthService` — autenticação via JWT Protheus com gerenciamento de sessão
- Guards de rota para proteção de módulos por papel de usuário
- Layout principal com sidebar, header e área de conteúdo
- Configuração de interceptors HTTP para injeção de token

### Fase 5: Frontend Editor e Execução

- Integração do Monaco Editor como editor SQL
- Syntax highlighting para SQL (SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP)
- Autocomplete de tabelas e colunas via metadados do backend
- Atalhos de teclado para execução (Ctrl+Enter) e formatação
- `ResultGrid` — exibição tabular de resultados com paginação
- Toolbar de execução com seleção de banco e botões de ação
- Confirmação obrigatória para comandos DML/DDL
- Feedback visual de tempo de execução e contagem de linhas

### Fase 6: Frontend Recursos Complementares

- Painel de Histórico — visualização e reexecução de queries anteriores
- Painel de Favoritos — CRUD completo com busca por nome/descrição
- Modal de Exportação — download direto em XLSX e CSV
- Sistema de múltiplas abas para queries simultâneas
- Notificações de sucesso/erro via POUI
- Tema e responsividade adaptados ao padrão Protheus WebApp

### Fase 7: Testes Unitários

- `ConnectionHelper.spec.tlpp` — testes de conexão e desconexão por banco
- `SqlDialectHelper.spec.tlpp` — testes de normalização de dialetos
- `ResultSetHelper.spec.tlpp` — testes de serialização de resultados
- `ValidationHelper.spec.tlpp` — testes de validação e sanitização de SQL
- `QueryService.spec.tlpp` — testes de orquestração de execução de queries

### Fase 8: Documentação e Deploy

- `architecture.md` — arquitetura técnica detalhada com diagramas
- `constitution.md` — visão, princípios e restrições do projeto
- `design.md` — especificação de UX/UI com wireframes POUI
- `security.md` — modelo de segurança completo (JWT, roles, auditoria)
- `orchestrator.md` — integração, fluxos e guia de implantação
- `implementation-plan.md` — plano faseado de desenvolvimento
- `testing.md` — estratégia e cobertura de testes
- Scripts de deploy embarcado no AppServer Protheus
- Configuração de menu SIGACFG e grupos de acesso
