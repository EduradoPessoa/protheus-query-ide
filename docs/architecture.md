# Architecture — ProtheusQuery IDE
> Especificação técnica da arquitetura do sistema: camadas, componentes, integrações e fluxos de dados.
> **v1.1 — Queries executadas via infraestrutura nativa do Protheus AppServer (TCQuery / MsConnect)**

---

## 1. Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PROTHEUS WEBAPP                              │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              FRONTEND — Angular 17+ + POUI                    │  │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌───────────────┐  │  │
│  │  │ Query    │ │ Histórico │ │Favoritos │ │  Resultados   │  │  │
│  │  │ Editor   │ │ Panel     │ │ Panel    │  │  Grid/Export  │  │  │
│  │  └────┬─────┘ └─────┬─────┘ └────┬─────┘ └───────┬───────┘  │  │
│  │       └─────────────┴────────────┴───────────────┘           │  │
│  │                    Angular Services (HTTP)                    │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
└──────────────────────────────│──────────────────────────────────────┘
                               │ HTTPS REST (JWT Protheus)
┌──────────────────────────────▼──────────────────────────────────────┐
│                    BACKEND — TLPP REST API                          │
│                     (Protheus AppServer)                            │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │ Auth        │ │ Query        │ │ Histórico    │ │ Export     │ │
│  │ Middleware  │ │ Controller   │ │ Controller   │ │ Controller │ │
│  └──────┬──────┘ └──────┬───────┘ └──────┬───────┘ └─────┬──────┘ │
│         │               │                │               │         │
│  ┌──────▼───────────────▼────────────────▼───────────────▼──────┐  │
│  │                   Service Layer (TLPP Classes)                 │  │
│  │  AuthService  QueryService  HistoryService  ExportService      │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────▼───────────────────────────────────┐  │
│  │          TLPP Database Layer — AppServer Native                │  │
│  │                                                               │  │
│  │  TCQuery / TCSqlExec / TCGenQry / TCSqlOpen                   │  │
│  │  MsConnect() / MsDisconnect()   ← conexões gerenciadas        │  │
│  │  RetSqlName() / GetNextAlias()     pelo AppServer             │  │
│  │  TCSqlError() / TCSqlAffected()                               │  │
│  │                                                               │  │
│  │  Conexão Principal    Conexão Adicional    Conexão Adicional  │  │
│  │  (Protheus Default)   (MsConnect alias 2)  (MsConnect alias 3)│  │
│  └──────────┬────────────────────┬───────────────────┬───────────┘  │
└─────────────│────────────────────│───────────────────│──────────────┘
              │                    │                   │
       ┌──────▼──────┐    ┌────────▼─────┐   ┌────────▼────┐
       │  SQL Server │    │    Oracle    │   │ PostgreSQL  │
       │  (Protheus) │    │  (via alias) │   │ (via alias) │
       └─────────────┘    └──────────────┘   └─────────────┘
```

---

## 2. Decisão Central — Execução via AppServer Nativo

> **Princípio fundamental:** Toda execução de SQL ocorre por meio das funções nativas TLPP do Protheus AppServer. A aplicação **não gerencia drivers, pools ou credenciais de banco diretamente**. O AppServer é o único responsável pelas conexões físicas aos bancos de dados.

### 2.1 Por Que Esta Abordagem

| Aspecto | Pool Independente (rejeitado) | Via AppServer Nativo (adotado) |
|---------|------------------------------|-------------------------------|
| Credenciais | Aplicação armazena e gerencia | AppServer gerencia; a aplicação não tem acesso |
| Compatibilidade | Requer drivers externos | 100% nativo TLPP; sem dependências extras |
| Multi-banco | Pool separado por banco | `MsConnect()` com aliases configurados no AppServer |
| Manutenção | Configuração dupla (app + AppServer) | Configuração única no AppServer.ini existente |
| Suporte Totvs | Não homologado | Totalmente suportado e documentado pela Totvs |
| Contexto Protheus | Isolado do ERP | Herda contexto de empresa/filial da sessão ativa |

### 2.2 Funções TLPP Nativas Utilizadas

| Função TLPP | Propósito |
|-------------|-----------|
| `TCQuery()` | Executa SELECT retornando cursor navegável |
| `TCSqlExec()` | Executa DML/DDL; retorna `.T.`/`.F.` |
| `TCSqlOpen()` | Abre cursor de resultado em alias de área de trabalho |
| `TCGenQry()` | Normaliza o SQL para o dialeto do banco ativo |
| `MsConnect()` | Abre conexão adicional por alias configurado no AppServer.ini |
| `MsDisconnect()` | Fecha conexão adicional (sempre no bloco `Finally`) |
| `RetSqlName()` | Retorna nome real da tabela no banco com prefixo de empresa |
| `GetNextAlias()` | Obtém alias de área de trabalho disponível |
| `TCSqlError()` | Retorna mensagem de erro nativa do banco |
| `TCSqlAffected()` | Retorna número de linhas afetadas pelo DML |
| `FieldName()` / `FieldType()` / `FieldGet()` | Introspecção e leitura de cursor |

### 2.3 Modelo de Conexões

A aplicação utiliza os aliases já configurados no `AppServer.ini` do ambiente Protheus. Não há configuração adicional exclusiva da aplicação para credenciais de banco.

```ini
# AppServer.ini (configuração existente do ambiente Protheus)

[DATABASE]                        # Conexão principal — SQL Server Protheus
Driver=MSSQL
Server=srv-sql01
Database=PROTHEUS_DB
...

[DBACCESS_ORACLE]                 # Alias adicional — Oracle
Driver=ORACLE
Server=srv-ora01/ORCL
Alias=DB_ORACLE
...

[DBACCESS_POSTGRES]               # Alias adicional — PostgreSQL
Driver=POSTGRES
Server=srv-pg01:5432
Database=protheus_pg
Alias=DB_POSTGRES
...
```

A seleção de conexão no backend:

```tlpp
// ConnectionHelper.tlpp
Class ConnectionHelper
  // Conexão padrão do Protheus — nenhuma ação necessária
  // Conexões adicionais abertas via MsConnect com alias do AppServer.ini
  Method Connect(cDatabase As Character) As Character
    Local cAlias As Character

    If cDatabase == "default" .Or. Empty(cDatabase)
      Return "" // Usa a conexão ativa do AppServer diretamente
    EndIf

    // Mapeia nome amigável para alias do AppServer.ini
    Do Case
      Case cDatabase == "oracle"   ; cAlias := "DB_ORACLE"
      Case cDatabase == "postgres" ; cAlias := "DB_POSTGRES"
      Otherwise
        UserException("Banco não reconhecido: " + cDatabase)
    EndCase

    If !MsConnect(cAlias)
      UserException("MsConnect falhou para alias '" + cAlias + ;
                    "'. Verifique AppServer.ini.")
    EndIf

    Return cAlias
  EndMethod

  Method Disconnect(cAlias As Character) As Logical
    If !Empty(cAlias)
      MsDisconnect(cAlias)
    EndIf
    Return .T.
  EndMethod
EndClass
```

---

## 3. Camada Frontend — Angular + POUI

### 3.1 Estrutura de Módulos

```
src/
├── app/
│   ├── core/
│   │   ├── auth/
│   │   │   ├── protheus-auth.guard.ts
│   │   │   ├── protheus-auth.interceptor.ts
│   │   │   └── auth.service.ts
│   │   ├── http/
│   │   │   └── api.service.ts
│   │   └── models/
│   │       ├── query.model.ts
│   │       ├── history.model.ts
│   │       ├── favorite.model.ts
│   │       └── connection.model.ts
│   ├── shared/
│   │   ├── components/
│   │   │   ├── confirm-dialog/
│   │   │   ├── result-grid/
│   │   │   └── status-bar/
│   │   └── pipes/
│   │       └── sql-highlight.pipe.ts
│   ├── features/
│   │   ├── query-editor/
│   │   │   ├── query-editor.component.ts
│   │   │   ├── query-editor.service.ts
│   │   │   └── query-editor.module.ts
│   │   ├── history/
│   │   ├── favorites/
│   │   └── results/
│   └── app-routing.module.ts
```

### 3.2 Componentes POUI Utilizados

| Componente POUI | Uso |
|----------------|-----|
| `po-page-default` | Layout principal |
| `po-toolbar` | Barra de ações e seletores |
| `po-split-container` | Editor / painel lateral |
| `po-table` | Grade de resultados |
| `po-select` | Seleção de banco e empresa |
| `po-button` / `po-button-group` | Executar, Salvar, Exportar |
| `po-modal` | Confirmação DML/DDL e salvar favorito |
| `po-tabs` | Abas de queries |
| `po-list-view` | Histórico e favoritos |
| `po-tag` | Tipo de query (SELECT/DML/DDL) |
| `po-notification` | Feedback de execução |
| `po-loading` | Estado de execução |
| `po-badge` | Contador de linhas |

### 3.3 Editor SQL — Monaco Editor

```typescript
export const MONACO_SQL_CONFIG: MonacoEditorConstructionOptions = {
  language: 'sql',
  theme: 'vs',
  fontSize: 14,
  fontFamily: 'Consolas, monospace',
  minimap: { enabled: false },
  lineNumbers: 'on',
  wordWrap: 'on',
  automaticLayout: true,
};
```

### 3.4 Seletor de Banco de Dados

O Angular popula o seletor de banco com base no endpoint `/connections`, que retorna apenas os aliases efetivamente disponíveis no AppServer (testados via `MsConnect`):

```typescript
// connection.model.ts
export interface DatabaseConnection {
  id: string;         // "default" | "oracle" | "postgres"
  label: string;      // "SQL Server (Protheus)" | "Oracle" | "PostgreSQL"
  available: boolean; // Testado pelo backend via MsConnect
}
```

---

## 4. Camada Backend — TLPP REST API

### 4.1 Estrutura de Classes TLPP

```
src/
├── controllers/
│   ├── QueryController.tlpp
│   ├── HistoryController.tlpp
│   ├── FavoriteController.tlpp
│   ├── ExportController.tlpp
│   └── SchemaController.tlpp
├── services/
│   ├── QueryService.tlpp         # Usa TCQuery / TCSqlExec
│   ├── HistoryService.tlpp
│   ├── FavoriteService.tlpp
│   ├── ExportService.tlpp
│   ├── AuthService.tlpp
│   └── SchemaService.tlpp
├── helpers/
│   ├── ConnectionHelper.tlpp     # MsConnect / MsDisconnect
│   ├── SqlDialectHelper.tlpp     # TOP / LIMIT / FETCH FIRST por banco
│   └── ResultSetHelper.tlpp      # Serializa cursor → JSON
├── models/
│   ├── QueryRequest.tlpp
│   ├── QueryResult.tlpp
│   ├── HistoryRecord.tlpp
│   └── FavoriteRecord.tlpp
└── middleware/
    ├── AuthMiddleware.tlpp
    ├── AuditMiddleware.tlpp
    └── RateLimitMiddleware.tlpp
```

### 4.2 QueryService — Implementação Principal

```tlpp
// QueryService.tlpp
Class QueryService

  Method ExecuteSelect(cSql As Character, cDatabase As Character,;
                       nMaxRows As Integer, nTimeout As Integer) As Object
    Local cAlias     As Character := ""
    Local cWrkAlias  As Character
    Local oResult    As Object    := JsonObject():New()
    Local nStart     As Integer   := Seconds()
    Local lExternal  As Logical   := (cDatabase != "default" .And. !Empty(cDatabase))

    If lExternal
      cAlias := ConnectionHelper():Connect(cDatabase)
    EndIf

    Try
      // Aplica limite de linhas compatível com o banco ativo
      Local cFinalSql As Character
      cFinalSql := SqlDialectHelper():ApplyRowLimit(cSql, nMaxRows, cDatabase)

      // TCGenQry normaliza o SQL para o dialeto do banco
      cFinalSql := TCGenQry(cFinalSql)

      // Abre cursor em alias livre
      cWrkAlias := GetNextAlias()
      TCSqlOpen(cFinalSql, cWrkAlias, .T., nTimeout)

      oResult:Set("columns",         ResultSetHelper():GetColumns(cWrkAlias))
      oResult:Set("rows",            ResultSetHelper():GetRows(cWrkAlias, nMaxRows))
      oResult:Set("rowCount",        Len(oResult:GetValue("rows")))
      oResult:Set("executionTimeMs", (Seconds() - nStart) * 1000)
      oResult:Set("queryType",       "SELECT")
      oResult:Set("success",         .T.)

      (cWrkAlias)->(DbCloseArea())

    Catch oError
      oResult:Set("success",     .F.)
      oResult:Set("error",       TCSqlError())
      oResult:Set("errorDetail", oError:Description)
    Finally
      If lExternal
        ConnectionHelper():Disconnect(cAlias)
      EndIf
    EndTry

    Return oResult
  EndMethod

  Method ExecuteDml(cSql As Character, cDatabase As Character) As Object
    Local cAlias    As Character := ""
    Local oResult   As Object    := JsonObject():New()
    Local lExternal As Logical   := (cDatabase != "default" .And. !Empty(cDatabase))

    If lExternal
      cAlias := ConnectionHelper():Connect(cDatabase)
    EndIf

    Try
      If TCSqlExec(cSql)
        oResult:Set("success",      .T.)
        oResult:Set("rowsAffected", TCSqlAffected())
      Else
        oResult:Set("success", .F.)
        oResult:Set("error",   TCSqlError())
      EndIf

    Catch oError
      oResult:Set("success",     .F.)
      oResult:Set("error",       TCSqlError())
      oResult:Set("errorDetail", oError:Description)
    Finally
      If lExternal
        ConnectionHelper():Disconnect(cAlias)
      EndIf
    EndTry

    Return oResult
  EndMethod

EndClass
```

### 4.3 ResultSetHelper — Serialização de Cursor

```tlpp
Class ResultSetHelper

  Method GetColumns(cAlias As Character) As Array
    Local aColumns As Array := {}
    Local i        As Integer
    For i := 1 To (cAlias)->(FCount())
      Local oCol As Object := JsonObject():New()
      oCol:Set("name", (cAlias)->(FieldName(i)))
      oCol:Set("type", (cAlias)->(FieldType(i)))  // C, N, D, L, M
      oCol:Set("size", (cAlias)->(FieldSize(i)))
      oCol:Set("dec",  (cAlias)->(FieldDec(i)))
      AAdd(aColumns, oCol)
    Next i
    Return aColumns
  EndMethod

  Method GetRows(cAlias As Character, nMaxRows As Integer) As Array
    Local aRows  As Array   := {}
    Local nCount As Integer := 0
    (cAlias)->(DbGoTop())
    While !(cAlias)->(Eof()) .And. nCount < nMaxRows
      Local aRow As Array := {}
      Local i    As Integer
      For i := 1 To (cAlias)->(FCount())
        AAdd(aRow, (cAlias)->(FieldGet(i)))
      Next i
      AAdd(aRows, aRow)
      (cAlias)->(DbSkip())
      nCount++
    EndDo
    Return aRows
  EndMethod

EndClass
```

### 4.4 SqlDialectHelper — Limite de Linhas por Banco

```tlpp
Class SqlDialectHelper

  Method ApplyRowLimit(cSql As Character, nMax As Integer,;
                       cDatabase As Character) As Character
    Local cUpper As Character := Upper(AllTrim(cSql))

    // Apenas para SELECT — DML/DDL não recebem limite
    If !(cUpper Begins "SELECT")
      Return cSql
    EndIf

    Do Case
      Case cDatabase == "default" .Or. cDatabase == "sqlserver"
        If !("TOP " InStr Upper(cSql))
          cSql := "SELECT TOP " + cValToChar(nMax) + " " + SubStr(cSql, 8)
        EndIf

      Case cDatabase == "oracle"
        cSql := cSql + " FETCH FIRST " + cValToChar(nMax) + " ROWS ONLY"

      Case cDatabase == "postgres"
        cSql := cSql + " LIMIT " + cValToChar(nMax)
    EndCase

    Return cSql
  EndMethod

EndClass
```

### 4.5 Endpoints REST

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/pqide/v1/connections` | Lista bancos disponíveis (aliases ativos no AppServer) |
| `POST` | `/api/pqide/v1/query/execute` | Executa SQL via TCQuery/TCSqlExec |
| `GET` | `/api/pqide/v1/history` | Lista histórico paginado do usuário |
| `GET` | `/api/pqide/v1/history/{id}` | Detalhe de uma execução |
| `DELETE` | `/api/pqide/v1/history/{id}` | Soft-delete de item do histórico |
| `GET` | `/api/pqide/v1/favorites` | Lista favoritos do usuário |
| `POST` | `/api/pqide/v1/favorites` | Cria favorito |
| `PUT` | `/api/pqide/v1/favorites/{id}` | Atualiza favorito |
| `DELETE` | `/api/pqide/v1/favorites/{id}` | Remove favorito |
| `POST` | `/api/pqide/v1/export` | Gera e baixa arquivo XLSX/CSV |
| `GET` | `/api/pqide/v1/schema/tables` | Lista tabelas do banco selecionado |
| `GET` | `/api/pqide/v1/schema/columns` | Lista colunas de uma tabela |

**Contrato de execução:**

```json
// POST /api/pqide/v1/query/execute
// Request
{
  "sql":      "SELECT * FROM SA1010 WHERE D_E_L_E_T_ = ' '",
  "database": "default",
  "company":  "01",
  "branch":   "01",
  "maxRows":  1000,
  "timeout":  30
}

// Response 200 — SELECT
{
  "executionId":     "uuid",
  "columns":         [{"name": "A1_COD", "type": "C", "size": 6, "dec": 0}],
  "rows":            [["000001", "CLIENTE A"]],
  "rowCount":        42,
  "executionTimeMs": 187,
  "queryType":       "SELECT",
  "success":         true
}

// Response 200 — DML
{
  "executionId":  "uuid",
  "rowsAffected": 3,
  "queryType":    "DML",
  "success":      true
}

// Response 422 — Erro de SQL
{
  "error": {
    "code":     "SQL_EXECUTION_ERROR",
    "message":  "Erro ao executar query",
    "dbError":  "[Mensagem nativa do banco via TCSqlError()]"
  }
}
```

---

## 5. Persistência de Dados da Aplicação

As tabelas `PQHIST`, `PQFAVS` e `PQAUDT` são gravadas **sempre na conexão padrão do Protheus** (banco principal), independente de qual banco-alvo foi usado para executar a query.

```sql
CREATE TABLE PQHIST (
  HIS_ID        CHAR(36)     NOT NULL,
  HIS_EMPRESA   CHAR(2)      NOT NULL,
  HIS_FILIAL    CHAR(2)      NOT NULL,
  HIS_USUARIO   CHAR(20)     NOT NULL,
  HIS_DTEXEC    DATETIME     NOT NULL,
  HIS_BANCO     CHAR(20)     NOT NULL,  -- "default" | "oracle" | "postgres"
  HIS_SQL       TEXT         NOT NULL,
  HIS_TIPO      CHAR(10)     NOT NULL,  -- SELECT | DML | DDL
  HIS_ROWS      INTEGER      DEFAULT 0,
  HIS_TEMPO     INTEGER      DEFAULT 0,
  HIS_STATUS    CHAR(1)      NOT NULL,  -- S=Sucesso E=Erro
  HIS_ERRO      TEXT,
  HIS_DELETED   CHAR(1)      DEFAULT ' ',
  PRIMARY KEY   (HIS_ID)
);

CREATE TABLE PQFAVS (
  FAV_ID        CHAR(36)     NOT NULL,
  FAV_EMPRESA   CHAR(2)      NOT NULL,
  FAV_USUARIO   CHAR(20)     NOT NULL,
  FAV_NOME      VARCHAR(100) NOT NULL,
  FAV_DESC      VARCHAR(500),
  FAV_SQL       TEXT         NOT NULL,
  FAV_BANCO     CHAR(20)     NOT NULL,
  FAV_DTCRI     DATETIME     NOT NULL,
  FAV_DTALT     DATETIME,
  FAV_DELETED   CHAR(1)      DEFAULT ' ',
  PRIMARY KEY   (FAV_ID)
);

CREATE TABLE PQAUDT (
  AUD_ID        CHAR(36)     NOT NULL,
  AUD_HISTID    CHAR(36),
  AUD_EMPRESA   CHAR(2)      NOT NULL,
  AUD_USUARIO   CHAR(20)     NOT NULL,
  AUD_IP        VARCHAR(45)  NOT NULL,
  AUD_DTLOG     DATETIME     NOT NULL,
  AUD_ACAO      CHAR(20)     NOT NULL,
  AUD_DETALHE   TEXT,
  PRIMARY KEY   (AUD_ID)
);
```

---

## 6. Integração com Protheus WebApp

### 6.1 Ponto de Entrada TLPP

```tlpp
Function PQIDEAPP()
  Local oApp As Object
  oApp := FwWebApp():New()
  oApp:SetPath("/pqide/")
  oApp:Run()
Return
```

### 6.2 Herança de Contexto Protheus no Angular

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  getToken():   string { return (window as any).TOTVS?.session?.token   ?? ''; }
  getUser():    any    { return (window as any).TOTVS?.session?.user;            }
  getCompany(): string { return (window as any).TOTVS?.session?.company ?? ''; }
  getBranch():  string { return (window as any).TOTVS?.session?.branch  ?? ''; }
}
```

---

## 7. Decisões Técnicas

| Aspecto | Decisão | Justificativa |
|---------|---------|---------------|
| Execução de SQL | `TCQuery` / `TCSqlExec` nativos | 100% suportado pela Totvs; sem drivers externos |
| Multi-banco | `MsConnect()` com aliases do AppServer.ini | AppServer gerencia credenciais; app não armazena senhas |
| Limite de linhas | `SqlDialectHelper` (TOP / LIMIT / FETCH FIRST) | Compatibilidade por dialeto; aplicado antes do `TCGenQry` |
| Serialização de cursor | `FieldGet()` / `FieldName()` / `FieldType()` | Compatível com todos os tipos Protheus (C/N/D/L/M) |
| Persistência de meta-dados | Conexão padrão (banco Protheus) | Histórico e favoritos sempre no banco principal |
| Erro de banco | `TCSqlError()` | Captura mensagem nativa para log e feedback ao usuário |
| Timeout | Parâmetro em `TCSqlOpen()` | Protege o AppServer de queries longas |
| Normalização de dialeto | `TCGenQry()` | Função nativa TLPP para compatibilidade de dialeto |

---

*Versão: 1.1 — Execução via AppServer nativo (TCQuery / TCSqlExec / MsConnect). Sem pool independente ou drivers externos.*
