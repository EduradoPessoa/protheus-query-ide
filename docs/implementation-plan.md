# Plano de Implementação — ProtheusQuery IDE

> Plano detalhado de desenvolvimento baseado nos documentos de especificação: Constitution, Architecture, Design, Security e Orchestrator.
> **Versão 1.0 — Planejado para execução via AppServer Protheus nativo (TCQuery / MsConnect)**

---

## 1. Visão Geral do Projeto

O ProtheusQuery IDE é uma aplicação web embarcada no ecossistema Totvs Protheus que permite a administradores de sistema executar, salvar, historiar e exportar queries SQL diretamente nos bancos de dados conectados ao Protheus. A ferramenta funciona como um SQL Management Studio contextualizado ao Protheus: leve, seguro, auditável e integrado ao ciclo de vida do sistema.

### 1.1 Escopo Técnico

| Componente | Tecnologia | Descrição |
|------------|------------|-----------|
| Frontend | Angular 17+ + POUI | Interface web embarcada no Protheus WebApp |
| Backend | TLPP (Protheus AppServer) | REST API executando via TCQuery/TCSqlExec nativos |
| Banco de Dados | SQL Server (padrão) + Oracle/PostgreSQL (opcionais) | Execução via conexões nativas do AppServer |
| Persistência | PQHIST, PQFAVS, PQAUDT | Tabelas de histórico, favoritos e auditoria |

### 1.2 Objetivos de Implementação

| Objetivo | Critério de Sucesso |
|----------|---------------------|
| Execução de queries SQL nos bancos suportados | Retorno correto de resultados em < 30s para queries padrão |
| Suportar SQL Server, Oracle e PostgreSQL | Abstração transparente de dialeto SQL por banco |
| Autenticar via SSO do Protheus | Zero cadastro adicional de usuário; sessão herdada do ERP |
| Persistir histórico de execuções | Últimas 200 queries por usuário disponíveis |
| Permitir salvar queries favoritas | CRUD completo de favoritos com nome e descrição |
| Exportar resultados em Excel e CSV | Download direto pelo browser |
| Suportar DML e DDL completos | Permissão gerenciada por papel de administrador |

### 1.3 Restrições Técnicas

| Restrição | Motivo |
|-----------|--------|
| Backend obrigatoriamente em TLPP | Integração nativa com Protheus AppServer |
| Frontend obrigatoriamente em Angular + POUI | Padrão Totvs para aplicações embarcadas |
| Autenticação exclusivamente via token Protheus | Herda identidade do ERP |
| Banco de dados da aplicação: mesmo banco do Protheus | Tabelas de histórico e favoritos no schema da empresa ativa |
| Execução de queries via funções nativas TLPP | TCQuery, TCSqlExec via DBAccess |
| Deploy embarcado no AppServer Protheus | Sem containers ou servidores externos |

---

## 2. Faseamento do Desenvolvimento

### Visão Geral das Fases

| Fase | Nome | Escopo | Estimativa |
|------|------|--------|-------------|
| **1** | Infraestrutura e Configuração | Ambiente de desenvolvimento, estrutura de pastas, build pipeline | 1 semana |
| **2** | Backend TLPP — Camada de Dados | Criação de tabelas, models e helpers de conexão | 2 semanas |
| **3** | Backend TLPP — API REST | Controllers, Services, Middlewares (Auth, Audit, RateLimit) | 3 semanas |
| **4** | Frontend — Estrutura e Autenticação | Angular core, POUI setup, AuthService, Guards | 2 semanas |
| **5** | Frontend — Editor e Execução | Monaco Editor, Query Editor, Result Grid, Toolbar | 3 semanas |
| **6** | Frontend — Recursos Complementares | Histórico, Favoritos, Exportação, Múltiplas Abas | 2 semanas |
| **7** | Integração e Testes End-to-End | Integração Angular ↔ TLPP, testes integrados | 2 semanas |
| **8** | Documentação e Deploy | Documentação operacional, implantação em produção | 1 semana |

**Estimativa Total: 16 semanas**

> **Nota:** As fases 4, 5 e 6 podem ser executadas em paralelo por diferentes desenvolvedores, desde que a fase 3 (Backend) esteja suficientemente avançada para disponibilizar os endpoints necessários.

---

## 3. Detalhamento das Fases

### Fase 1: Infraestrutura e Configuração

**Duração:** 1 semana  
**Responsável:** Desenvolvedor Full Stack / DevOps  
**Dependências:** Nenhuma (início do projeto)

#### Objetivos

Estabelecer a estrutura técnica do projeto, ambientes de desenvolvimento e pipelines de build necessários para suportar o desenvolvimento das camadas frontend e backend.

#### Tarefas Detalhadas

| # | Tarefa | Entregável | Detalhamento |
|---|--------|------------|--------------|
| 1.1 | Configurar repositório Git | Repositório inicializado | Estrutura de pastas: `frontend/src`, `backend/src`, `docs`; arquivo .gitignore para TLPP e Node |
| 1.2 | Criar projeto Angular | Projeto Angular 17+ configurado | `ng new pqide-frontend --routing --style=scss`; configuração de workspace para POUI |
| 1.3 | Configurar ambiente de desenvolvimento TLPP | Ambiente de desenvolvimento TLPP | Estrutura de pastas `src/controllers`, `src/services`, `src/helpers`, `src/models`, `src/middleware` conforme architecture.md |
| 1.4 | Configurar build pipeline do Angular | Pipeline de build configurado | Scripts npm para build production; configuração de environment para development e production |
| 1.5 | Configurar conexão com AppServer de desenvolvimento | AppServer acessível | Validação de acesso ao AppServer de dev; configuração de porta REST |
| 1.6 | Criar estrutura de tabelas SQL | Scripts SQL de criação | Scripts para PQHIST, PQFAVS, PQAUDT conforme architecture.md seção 5 |
| 1.7 | Configurar logging estruturado | Sistema de logs configurado | Log4Protheus ou equivalente para rastrear execuções |

#### Critérios de Aceite

- [ ] Repositório Git criado com estrutura de pastas definida
- [ ] Projeto Angular compila sem erros (`ng build`)
- [ ] Fontes TLPP compilam no ambiente de desenvolvimento
- [ ] Tabelas PQHIST, PQFAVS, PQAUDT criadas no banco de desenvolvimento
- [ ] Build pipeline do Angular produz bundles otimizados

#### Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Atraso na configuração do ambiente TLPP | Média | Alto | Solicitar suporte do DBA/infra antecipadamente |
| Incompatibilidade de versão Angular/POUI | Baixa | Médio | Validar versões compatíveis antes de configurar package.json |

---

### Fase 2: Backend TLPP — Camada de Dados

**Duração:** 2 semanas  
**Responsável:** Desenvolvedor TLPP  
**Dependências:** Fase 1 concluída

#### Objetivos

Implementar a camada de dados do backend TLPP, incluindo models, helpers de conexão, normalização de dialetos e serialização de resultados.

#### Tarefas Detalhadas

| # | Tarefa | Entregável | Detalhamento |
|---|--------|------------|--------------|
| 2.1 | Implementar ConnectionHelper | ConnectionHelper.tlpp | Classe com métodos Connect() e Disconnect() usando MsConnect/MsDisconnect; mapeamento de aliases (default, oracle, postgres) conforme architecture.md seção 2.3 |
| 2.2 | Implementar SqlDialectHelper | SqlDialectHelper.tlpp | Classe com método ApplyRowLimit() que aplica TOP (SQL Server), FETCH FIRST (Oracle), LIMIT (PostgreSQL); normalização via TCGenQry |
| 2.3 | Implementar ResultSetHelper | ResultSetHelper.tlpp | Métodos GetColumns() e GetRows() usando FieldName, FieldType, FieldSize, FieldGet; serialização de cursor para JSON |
| 2.4 | Criar Models de Request/Response | QueryRequest.tlpp, QueryResult.tlpp | Classes que definem estrutura de dados para requisição e resposta de queries |
| 2.5 | Criar Models de Persistência | HistoryRecord.tlpp, FavoriteRecord.tlpp | Definição de estruturas para histórico e favoritos |
| 2.6 | Implementar Queries de Persistência | Rotinas de INSERT/SELECT | Métodos para gravar e recuperar dados das tabelas PQHIST, PQFAVS, PQAUDT |
| 2.7 | Implementar SchemaService | SchemaService.tlpp | Métodos para listar tabelas (via RetSqlName) e colunas de uma tabela |

#### Critérios de Aceite

- [ ] ConnectionHelper gerencia conexões corretamente (MsConnect/MsDisconnect)
- [ ] SqlDialectHelper aplica limites de linha corretos por banco
- [ ] ResultSetHelper serializa colunas e linhas corretamente
- [ ] Models de request/response seguem contratos definidos na arquitetura
- [ ] Persistência em PQHIST e PQFAVS funciona corretamente
- [ ] SchemaService retorna lista de tabelas e colunas

#### Riscos Identificados

| R
