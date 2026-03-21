# Orchestrator — ProtheusQuery IDE
> Visão de integração do sistema: como as peças se conectam, fluxos de dados end-to-end, contratos entre camadas e guia de implantação.
> **v1.1 — Execução de queries via AppServer Protheus nativo (TCQuery / MsConnect)**

---

## 1. Visão de Integração

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          ECOSSISTEMA PROTHEUS                            │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  PROTHEUS WEBAPP (Browser)                                        │   │
│  │                                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────┐     │   │
│  │  │  ProtheusQuery IDE — Angular + POUI                      │     │   │
│  │  │                                                           │     │   │
│  │  │  window.TOTVS.session ──► AuthService ──► Interceptor    │     │   │
│  │  │                                              │            │     │   │
│  │  │  QueryEditor ──► QueryService ──► HTTP ──────┘            │     │   │
│  │  │  HistoryPanel ──► HistoryService ──► HTTP                 │     │   │
│  │  │  FavoritesPanel ──► FavoriteService ──► HTTP              │     │   │
│  │  └──────────────────────────────────────────────────────────┘     │   │
│  └──────────────────────────────────│───────────────────────────────┘   │
│                                     │ HTTPS + JWT                        │
│  ┌──────────────────────────────────▼───────────────────────────────┐   │
│  │  PROTHEUS APPSERVER — TLPP REST                                   │   │
│  │                                                                   │   │
│  │  AuthMiddleware ──► RateLimitMiddleware ──► AuditMiddleware       │   │
│  │         │                                                         │   │
│  │         ▼                                                         │   │
│  │  QueryController  HistoryController  FavoriteController           │   │
│  │  ExportController SchemaController                                │   │
│  │         │                                                         │   │
│  │  QueryService  HistoryService  FavoriteService  ExportService     │   │
│  │         │                                                         │   │
│  │  ┌──────▼────────────────────────────────────────────────┐       │   │
│  │  │  TLPP Database Layer (AppServer Nativo)                │       │   │
│  │  │                                                        │       │   │
│  │  │  TCQuery / TCSqlExec / TCGenQry / TCSqlOpen            │       │   │
│  │  │  ConnectionHelper (MsConnect / MsDisconnect)           │       │   │
│  │  │  SqlDialectHelper (TOP / LIMIT / FETCH FIRST)          │       │   │
│  │  │  ResultSetHelper (FieldGet / FieldName / FieldType)    │       │   │
│  │  └──────┬─────────────────────┬────────────────┬──────────┘       │   │
│  │         │ conexão padrão      │ MsConnect       │ MsConnect        │   │
│  │         │ (AppServer.ini)     │ DB_ORACLE        │ DB_POSTGRES      │   │
│  │                                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────┐     │   │
│  │  │  Banco Protheus: PQHIST + PQFAVS + PQAUDT               │     │   │
│  │  │  (gravados sempre na conexão padrão do AppServer)        │     │   │
│  │  └─────────────────────────────────────────────────────────┘     │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────┐       ┌──────────────┐        ┌─────────────┐          │
│  │  SQL Server │       │    Oracle    │        │ PostgreSQL  │          │
│  │ (Protheus)  │       │  (DB_ORACLE) │        │(DB_POSTGRES)│          │
│  └─────────────┘       └──────────────┘        └─────────────┘          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Fluxos de Dados End-to-End

### 2.1 Fluxo: Execução de SELECT (conexão padrão)

```
Usuário       Angular         TLPP Backend        SQL Server (Protheus)
   │              │                 │                       │
   │ F5           │                 │                       │
   │─────────────>│                 │                       │
   │              │ POST /query/    │                       │
   │              │ execute        │                       │
   │              │ {sql, database:│                       │
   │              │  "default"}     │                       │
   │              │────────────────>│                       │
   │              │                 │ AuthMiddleware         │
   │              │                 │ → valida JWT           │
   │              │                 │ RateLimitMiddleware    │
   │              │                 │ AuditMiddleware        │
   │              │                 │ → grava início PQAUDT  │
   │              │                 │ QueryService           │
   │              │                 │ → DetectQueryType = SELECT
   │              │                 │ → ValidateSqlInput ✓   │
   │              │                 │ → SqlDialectHelper     │
   │              │                 │   aplica TOP 1000      │
   │              │                 │ → TCGenQry() normaliza │
   │              │                 │ → GetNextAlias()       │
   │              │                 │ → TCSqlOpen()          │
   │              │                 │───────────────────────>│
   │              │                 │ ← cursor aberto        │
   │              │                 │ ResultSetHelper        │
   │              │                 │ → GetColumns()         │
   │              │                 │ → GetRows()            │
   │              │                 │ → DbCloseArea()        │
   │              │                 │ HistoryService         │
   │              │                 │ → INSERT PQHIST        │
   │              │                 │ AuditMiddleware        │
   │              │                 │ → UPDATE PQAUDT (fim)  │
   │              │<────────────────│                       │
   │              │ {columns, rows, │                       │
   │              │  rowCount, ...} │                       │
   │ po-table     │                 │                       │
   │ renderizado  │                 │                       │
   │<─────────────│                 │                       │
```

### 2.2 Fluxo: Execução de SELECT (Oracle via MsConnect)

```
Usuário       Angular         TLPP Backend        Oracle (DB_ORACLE)
   │              │                 │                       │
   │ F5 (Oracle)  │                 │                       │
   │─────────────>│                 │                       │
   │              │ POST /query/    │                       │
   │              │ execute        │                       │
   │              │ {sql, database:│                       │
   │              │  "oracle"}      │                       │
   │              │────────────────>│                       │
   │              │                 │ Auth + Audit          │
   │              │                 │ ConnectionHelper      │
   │              │                 │ → MsConnect("DB_ORACLE")
   │              │                 │───────────────────────>│
   │              │                 │ ← conexão estabelecida │
   │              │                 │ SqlDialectHelper       │
   │              │                 │ → aplica FETCH FIRST 1000 ROWS ONLY
   │              │                 │ → TCGenQry() normaliza │
   │              │                 │ → TCSqlOpen()          │
   │              │                 │───────────────────────>│
   │              │                 │ ← cursor               │
   │              │                 │ ResultSetHelper        │
   │              │                 │ → serializa resultado  │
   │              │                 │ → DbCloseArea()        │
   │              │                 │ [Finally]              │
   │              │                 │ ConnectionHelper       │
   │              │                 │ → MsDisconnect("DB_ORACLE")
   │              │                 │ HistoryService (conn padrão)
   │              │                 │ → INSERT PQHIST        │
   │              │<────────────────│                       │
   │ resultado    │                 │                       │
   │<─────────────│                 │                       │
```

### 2.3 Fluxo: Execução de DDL (com confirmação obrigatória)

```
Usuário       Angular              TLPP Backend
   │              │                      │
   │ Digita DDL   │                      │
   │ pressiona F5 │                      │
   │─────────────>│                      │
   │              │ DetectQueryType (client-side)
   │              │ → tipo == "DDL"      │
   │              │                      │
   │ po-modal     │                      │
   │ confirmação  │                      │
   │<─────────────│                      │
   │ Confirma     │                      │
   │─────────────>│                      │
   │              │ POST /query/execute  │
   │              │ {sql, database}      │
   │              │─────────────────────>│
   │              │                      │ Auth
   │              │                      │ DetectQueryType (server-side)
   │              │                      │ → tipo == "DDL"
   │              │                      │ UserHasRole(PQIDE_ADMIN) ✓
   │              │                      │ ValidateSqlInput ✓
   │              │                      │ AuditMiddleware
   │              │                      │ → INSERT PQAUDT (DDL sempre logado)
   │              │                      │ ConnectionHelper → MsConnect (se externo)
   │              │                      │ TCSqlExec(cSql)
   │              │                      │ TCSqlAffected()
   │              │                      │ [Finally] MsDisconnect
   │              │                      │ HistoryService → INSERT PQHIST
   │              │<─────────────────────│
   │ po-notification                     │
   │ sucesso/erro │                      │
   │<─────────────│                      │
```

### 2.4 Fluxo: Exportação de Resultado

```
Usuário       Angular         TLPP Backend
   │              │                 │
   │ Clica        │                 │
   │ Exportar     │                 │
   │ XLSX         │                 │
   │─────────────>│                 │
   │              │ POST /export    │
   │              │ {executionId,   │
   │              │  format:"xlsx"} │
   │              │────────────────>│
   │              │                 │ Auth
   │              │                 │ ExportController
   │              │                 │ → busca SQL em PQHIST por executionId
   │              │                 │ → re-executa query via TCQuery
   │              │                 │ → ExportService:GenerateXlsx()
   │              │                 │ → AuditMiddleware: INSERT PQAUDT (EXPORT)
   │              │<────────────────│
   │              │ Content-Type:   │
   │              │ octet-stream    │
   │ Browser      │                 │
   │ baixa        │                 │
   │ arquivo      │                 │
   │<─────────────│                 │
```

### 2.5 Fluxo: Verificação de Bancos Disponíveis

```
Angular         TLPP Backend        AppServer.ini
   │                 │                    │
   │ GET /connections│                    │
   │────────────────>│                    │
   │                 │ Lê aliases         │
   │                 │ configurados       │
   │                 │ Testa MsConnect    │
   │                 │ "DB_ORACLE"        │
   │                 │ → disponível ✓     │
   │                 │ MsDisconnect       │
   │                 │ Testa MsConnect    │
   │                 │ "DB_POSTGRES"      │
   │                 │ → indisponível ✗   │
   │<────────────────│                    │
   │ [{id:"default", │                    │
   │   available:T}, │                    │
   │  {id:"oracle",  │                    │
   │   available:T}, │                    │
   │  {id:"postgres",│                    │
   │   available:F}] │                    │
   │                 │                    │
   │ Popula po-select│                    │
   │ (postgres apar- │                    │
   │  ece desabilitado)                   │
```

---

## 3. Contratos Entre Camadas

### 3.1 Angular → TLPP

**Obrigações do Frontend:**
- Enviar `Authorization: Bearer {jwt}` em toda requisição
- Enviar `X-Protheus-Company` e `X-Protheus-Branch` nos headers
- Classificar o tipo de query apenas para UX (confirmação); nunca para decisão de segurança
- Tratar erros pelo campo `error.code` da resposta

**Obrigações do Backend:**
- Validar token JWT antes de qualquer processamento
- Re-classificar tipo de query server-side (nunca confiar no cliente)
- Retornar HTTP status semânticos: 200, 400, 401, 403, 422, 429, 500, 503
- Nunca expor stack trace ou detalhes de infraestrutura em respostas de erro

### 3.2 TLPP → TLPP Database Layer

**Obrigações do QueryService:**
- Sempre liberar conexão MsConnect no bloco `Finally` (obrigatório)
- Sempre fechar cursor (`DbCloseArea`) antes de retornar
- Nunca passar SQL diretamente do request ao `TCSqlOpen` sem `ValidateSqlInput`
- Sempre aplicar limite de linhas via `SqlDialectHelper` antes de executar

**Obrigações do AuditMiddleware:**
- Gravar em `PQAUDT` **antes** de executar a query (registra a tentativa)
- Atualizar `PQAUDT` **após** execução com status e resultado
- DDL: auditoria obrigatória independente de sucesso ou falha

### 3.3 TLPP → Tabelas de Persistência

| Tabela | Operações permitidas pela API | Restrição |
|--------|------------------------------|-----------|
| `PQAUDT` | Apenas INSERT | Sem DELETE/UPDATE via aplicação |
| `PQHIST` | INSERT + soft-delete (HIS_DELETED) | Sem DELETE físico via aplicação |
| `PQFAVS` | CRUD completo | Soft-delete; sem DELETE físico |

---

## 4. Ciclo de Vida de uma Request

```
[Request HTTP chega ao AppServer]
         │
         ▼
[1. AuthMiddleware]
   Token JWT ausente/inválido/expirado → 401
   Usuário sem acesso ao PQIDE         → 403
   Token válido                        → continua
         │
         ▼
[2. RateLimitMiddleware]
   > 60 req/min por usuário → 429
   Dentro do limite         → continua
         │
         ▼
[3. Router — seleciona Controller]
         │
         ▼
[4. AuditMiddleware — INSERT em PQAUDT (início)]
         │
         ▼
[5. Controller — valida parâmetros do request]
   Parâmetros inválidos → 400
         │
         ▼
[6. Service — ValidateSqlInput]
   SQL perigoso (EXEC, SP_, multiplos statements) → 400
         │
         ▼
[7. Service — verifica role por tipo de query]
   DDL sem PQIDE_ADMIN     → 403
   DML sem PQIDE_OPERATOR  → 403
         │
         ▼
[8. ConnectionHelper — MsConnect se banco externo]
   Falha de conexão → 503
         │
         ▼
[9. SqlDialectHelper — aplica limite de linhas]
         │
         ▼
[10. TCGenQry — normaliza dialeto]
         │
         ▼
[11. TCSqlOpen / TCSqlExec — executa no banco via AppServer]
   Erro de SQL → 422 + TCSqlError()
   Timeout     → 408
         │
         ▼
[12. ResultSetHelper — serializa resultado (SELECT)]
         │
         ▼
[13. Finally — MsDisconnect + DbCloseArea]
         │
         ▼
[14. HistoryService — INSERT em PQHIST]
         │
         ▼
[15. AuditMiddleware — UPDATE em PQAUDT (conclusão)]
         │
         ▼
[16. Response → 200 com payload JSON]
```

---

## 5. Guia de Implantação

### 5.1 Pré-Requisitos de Ambiente

| Componente | Versão Mínima | Observação |
|-----------|---------------|-----------|
| Protheus AppServer | 12.1.2310 | Suporte a TLPP e REST nativo |
| TOTVS WebApp | 12.1.2310 | Para embed da aplicação Angular |
| Node.js (build) | 18 LTS | Apenas para compilar Angular; não fica em produção |
| Angular CLI | 17+ | Apenas para build |
| POUI | 17+ | Compatível com a versão do Angular |
| ngx-monaco-editor | 17+ | Compatível com a versão do Angular |

### 5.2 Etapas de Implantação

```bash
# 1. Build do frontend Angular
cd frontend/
npm install
ng build --configuration production --base-href /pqide/
# Output: dist/pqide/

# 2. Copiar build para o AppServer
cp -r dist/pqide/* /appserver/web/pqide/

# 3. Copiar e compilar fontes TLPP
cp -r backend/src/* /appserver/tlpp/pqide/
# Compilar via TOTVS Developer Studio ou compilação remota

# 4. Criar tabelas PQHIST, PQFAVS, PQAUDT no banco Protheus
# Executar scripts SQL de criação no banco da empresa ativa

# 5. Configurar aliases de banco externo no AppServer.ini (se necessário)
# [DBACCESS_ORACLE]  e  [DBACCESS_POSTGRES]  — gerenciados pelo DBA/infra

# 6. Configurar menu e grupo de acesso no Protheus
# SIGACFG → Cadastros → Menus:
#   Adicionar: "ProtheusQuery IDE" → Programa: PQIDEAPP
# SIGACFG → Segurança → Grupos de Acesso:
#   Criar grupo PQIDE_ADMIN e adicionar usuários Administradores de Sistema

# 7. Reiniciar AppServer para carregar novas fontes TLPP
```

### 5.3 Configuração do AppServer.ini (seção REST)

```ini
[HTTPREST]
Port=8080
MaxConnections=200
Compression=1

[PQIDE_ROUTE]
Enable=1
URIPrefix=/api/pqide
AllowedHosts=*

# Aliases de banco externo (gerenciados pelo DBA — não pela aplicação)
[DBACCESS_ORACLE]
Driver=ORACLE
Server=srv-ora01/ORCL
Alias=DB_ORACLE

[DBACCESS_POSTGRES]
Driver=POSTGRES
Server=srv-pg01:5432
Database=protheus_pg
Alias=DB_POSTGRES
```

### 5.4 Variáveis de Ambiente Angular

```typescript
// environment.production.ts
export const environment = {
  production:           true,
  apiBaseUrl:           '/api/pqide/v1',
  maxQueryRows:         1000,
  queryTimeoutDefault:  30,
  queryTimeoutMax:      300,
  historyPageSize:      20,
  historyMaxItems:      200,
};
```

---

## 6. Monitoramento e Operação

### 6.1 Indicadores Operacionais

| Métrica | Fonte | Alerta |
|---------|-------|--------|
| Queries com erro | `PQAUDT` onde `AUD_ACAO = 'EXECUTE_ERROR'` | > 10/min |
| Tempo médio de execução | `PQHIST.HIS_TEMPO` | > 15.000ms |
| DDL executados | `PQHIST` onde `HIS_TIPO = 'DDL'` | Notificação imediata ao DBA |
| Acessos negados | `PQAUDT` onde `AUD_ACAO = 'ACCESS_DENIED'` | > 5/min |
| Exportações realizadas | `PQAUDT` onde `AUD_ACAO = 'EXPORT'` | Monitoramento contínuo |
| Falhas de MsConnect | Log do AppServer | Qualquer ocorrência |

### 6.2 Queries de Monitoramento

```sql
-- Queries mais lentas nas últimas 24h
SELECT HIS_USUARIO, HIS_BANCO, HIS_TEMPO, HIS_SQL
FROM PQHIST
WHERE HIS_DTEXEC >= DATEADD(day, -1, GETDATE())
  AND HIS_STATUS = 'S'
ORDER BY HIS_TEMPO DESC
FETCH FIRST 10 ROWS ONLY;

-- DDLs executados hoje (auditoria crítica)
SELECT AUD_USUARIO, AUD_DTLOG, AUD_DETALHE
FROM PQAUDT
WHERE AUD_DTLOG >= CAST(GETDATE() AS DATE)
  AND AUD_ACAO IN ('EXECUTE_DDL')
ORDER BY AUD_DTLOG DESC;

-- Usuários ativos nas últimas 2h
SELECT HIS_USUARIO, COUNT(*) QTD, AVG(HIS_TEMPO) MEDIA_MS
FROM PQHIST
WHERE HIS_DTEXEC >= DATEADD(hour, -2, GETDATE())
GROUP BY HIS_USUARIO
ORDER BY QTD DESC;
```

### 6.3 Procedimento de Rollback

```
1. Parar AppServer
2. Restaurar backup dos fontes TLPP anteriores em /tlpp/pqide/
3. Restaurar build Angular anterior em /web/pqide/
4. Reiniciar AppServer
5. Tabelas PQHIST/PQFAVS/PQAUDT são mantidas (sem rollback de dados)
6. Documentar causa raiz e comunicar equipe
```

---

## 7. Mapa de Dependências

```
ProtheusQuery IDE
├── Runtime
│   ├── Protheus AppServer 12.1.2310+     [OBRIGATÓRIO]
│   │   ├── TCQuery / TCSqlExec           [NATIVO TLPP]
│   │   ├── MsConnect / MsDisconnect      [NATIVO TLPP]
│   │   ├── TCGenQry / TCSqlOpen          [NATIVO TLPP]
│   │   └── TLPP_ValidateJWT              [NATIVO APPSERVER]
│   ├── Protheus WebApp                   [OBRIGATÓRIO]
│   ├── Banco Protheus (PQHIST/PQFAVS/PQAUDT) [OBRIGATÓRIO]
│   ├── SQL Server (conexão padrão)       [OBRIGATÓRIO]
│   ├── Oracle (alias DB_ORACLE)          [OPCIONAL]
│   ├── PostgreSQL (alias DB_POSTGRES)    [OPCIONAL]
│   └── Certificado TLS/HTTPS             [OBRIGATÓRIO EM PRODUÇÃO]
│
├── Frontend (Build)
│   ├── Angular 17+                       [OBRIGATÓRIO]
│   ├── POUI 17+                          [OBRIGATÓRIO]
│   ├── ngx-monaco-editor 17+             [OBRIGATÓRIO]
│   └── Node.js 18 LTS                    [BUILD ONLY]
│
└── Operacional
    ├── TOTVS Developer Studio            [DESENVOLVIMENTO/DEPLOY]
    └── Acesso ao AppServer               [DEPLOY/OPS]
```

---

## 8. Roadmap de Evolução

| Versão | Feature | Pré-requisito |
|--------|---------|---------------|
| **1.0** | SELECT/DML/DDL via AppServer, Histórico, Favoritos, Exportação | Este documento |
| **1.1** | Autocomplete de tabelas Protheus (`RetSqlName` + SchemaController) | SchemaController implementado |
| **1.2** | Múltiplas abas simultâneas com resultados independentes | Refatoração de ResultState |
| **1.3** | Timeout configurável por usuário (dentro de limite máximo) | Settings no frontend |
| **2.0** | Roles granulares (VIEWER/OPERATOR/ADMIN) via SIGACFG | Integração SIGACFG avançada |
| **2.1** | Agendamento de queries (jobs TLPP nativos) | JobScheduler TLPP |
| **2.2** | Compartilhamento de favoritos entre usuários | PQFAVS v2 com campo de visibilidade |

---

*Versão: 1.1 — Execução de queries via AppServer nativo. MsConnect para bancos adicionais; sem pool independente ou credenciais na aplicação.*
