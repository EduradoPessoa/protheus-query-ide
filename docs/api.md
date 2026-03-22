# API REST — ProtheusQuery IDE
> Documentação oficial dos endpoints REST da aplicação ProtheusQuery IDE.
> **Base URL:** `/api/pqide/v1`
> **v1.1 — Execução via AppServer nativo (TCQuery / TCSqlExec / MsConnect)**

---

## 1. Visão Geral

A API REST do ProtheusQuery IDE expõe endpoints para execução de queries SQL, gerenciamento de histórico e favoritos, exportação de resultados e introspecção de schema. Toda comunicação ocorre via HTTPS com autenticação JWT herdada do Protheus WebApp.

**Princípios:**
- SQL executado via funções nativas TLPP (`TCQuery`, `TCSqlExec`) — sem drivers externos
- Conexões de banco gerenciadas pelo AppServer via aliases no `AppServer.ini`
- Auditoria total de todas as operações em tabela `PQAUDT`
- Controle de acesso baseado em roles (`PQIDE_VIEWER`, `PQIDE_OPERATOR`, `PQIDE_ADMIN`)

**Content-Type:** `application/json` em todas as requisições e respostas.

---

## 2. Autenticação

### 2.1 Fluxo JWT

A autenticação utiliza JWT emitido pelo Protheus AppServer durante o login no Protheus WebApp. O token é herdado da sessão ativa e injetado automaticamente pelo `ProtheusAuthInterceptor` do Angular em cada request.

```
Header HTTP obrigatório:
  Authorization: Bearer <jwt_token>
  X-Protheus-Company: <codigo_empresa>
  X-Protheus-Branch: <codigo_filial>
```

### 2.2 Validação

O `AuthMiddleware` TLPP valida o token a cada request:

1. Verifica presença do header `Authorization`
2. Valida assinatura e expiração via função nativa `TLPP_ValidateJWT()`
3. Verifica acesso ao módulo PQIDE via grupos no SIGACFG
4. Extrai `currentUser` e `userPayload` para uso nos controllers

### 2.3 Headers de Contexto

| Header | Obrigatório | Descrição |
|--------|:-----------:|-----------|
| `Authorization` | Sim | Token JWT no formato `Bearer <token>` |
| `X-Protheus-Company` | Sim | Código da empresa Protheus (ex: `01`) |
| `X-Protheus-Branch` | Sim | Código da filial Protheus (ex: `01`) |
| `Content-Type` | Sim | `application/json` |

### 2.4 Códigos de Erro de Autenticação

| Código | HTTP | Descrição |
|--------|------|-----------|
| `MISSING_TOKEN` | 401 | Header `Authorization` ausente |
| `INVALID_TOKEN` | 401 | Token inválido, expirado ou com assinatura incorreta |
| `ACCESS_DENIED` | 403 | Usuário sem acesso ao módulo ProtheusQuery IDE |

```json
// 401 — Token ausente ou inválido
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Token inválido ou expirado"
  }
}

// 403 — Sem acesso ao módulo
{
  "error": {
    "code": "ACCESS_DENIED",
    "message": "Usuário sem acesso ao ProtheusQuery IDE"
  }
}
```

---

## 3. Endpoints

### 3.1 Conexões

#### `GET /connections`

Lista bancos de dados disponíveis. O backend testa cada alias configurado no `AppServer.ini` via `MsConnect()` e retorna apenas os efetivamente acessíveis.

**Autenticação:** Obrigatória

**Parâmetros de Request:** Nenhum

**Response 200:**

```json
[
  {
    "id": "default",
    "label": "SQL Server (Protheus)",
    "available": true
  },
  {
    "id": "oracle",
    "label": "Oracle",
    "available": true
  },
  {
    "id": "postgres",
    "label": "PostgreSQL",
    "available": false
  }
]
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | Identificador da conexão usado nos demais endpoints |
| `label` | string | Nome amigável exibido no seletor do frontend |
| `available` | boolean | `true` se `MsConnect(alias)` retornou sucesso |

**Códigos de Erro:**

| HTTP | Código | Descrição |
|------|--------|-----------|
| 401 | `INVALID_TOKEN` | Token JWT inválido ou ausente |
| 403 | `ACCESS_DENIED` | Sem acesso ao módulo |

---

### 3.2 Query

#### `POST /query/execute`

Executa uma instrução SQL no banco selecionado. O tipo de query (`SELECT`, `DML`, `DDL`) é detectado **server-side** — nunca confiado do cliente. SELECTs são executados via `TCQuery`/`TCSqlOpen`; DML/DDL via `TCSqlExec`.

**Autenticação:** Obrigatória

**Controle de Role:**
- `SELECT` — qualquer role (`PQIDE_VIEWER`, `PQIDE_OPERATOR`, `PQIDE_ADMIN`)
- `DML` (`INSERT`, `UPDATE`, `DELETE`, `MERGE`) — `PQIDE_OPERATOR` ou `PQIDE_ADMIN`
- `DDL` (`CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `RENAME`) — apenas `PQIDE_ADMIN`

**Request Body:**

```json
{
  "sql": "SELECT * FROM SA1010 WHERE D_E_L_E_T_ = ' '",
  "database": "default",
  "company": "01",
  "branch": "01",
  "maxRows": 1000,
  "timeout": 30
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| `sql` | string | Sim | Instrução SQL a ser executada (um statement por request) |
| `database` | string | Sim | ID da conexão (`default`, `oracle`, `postgres`) |
| `company` | string | Sim | Código da empresa Protheus |
| `branch` | string | Sim | Código da filial Protheus |
| `maxRows` | integer | Não | Limite máximo de linhas retornadas (padrão: 1000) |
| `timeout` | integer | Não | Timeout em segundos (padrão: 30) |

**Response 200 — SELECT:**

```json
{
  "executionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "columns": [
    { "name": "A1_COD",  "type": "C", "size": 6,  "dec": 0 },
    { "name": "A1_NOME", "type": "C", "size": 40, "dec": 0 },
    { "name": "A1_EST",  "type": "C", "size": 2,  "dec": 0 }
  ],
  "rows": [
    ["000001", "CLIENTE EXEMPLO LTDA", "SP"],
    ["000002", "OUTRO CLIENTE S/A", "RJ"]
  ],
  "rowCount": 2,
  "executionTimeMs": 187,
  "queryType": "SELECT",
  "success": true
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `executionId` | string (UUID) | Identificador único da execução (usado para auditoria e exportação) |
| `columns` | array | Metadados das colunas retornadas |
| `columns[].name` | string | Nome da coluna no banco |
| `columns[].type` | string | Tipo Protheus (`C`=Character, `N`=Numeric, `D`=Date, `L`=Logical, `M`=Memo) |
| `columns[].size` | integer | Tamanho do campo |
| `columns[].dec` | integer | Casas decimais (para campos numéricos) |
| `rows` | array de arrays | Dados das linhas; cada array interno corresponde a uma linha |
| `rowCount` | integer | Número de linhas retornadas |
| `executionTimeMs` | integer | Tempo de execução em milissegundos |
| `queryType` | string | Tipo detectado: `SELECT`, `DML` ou `DDL` |
| `success` | boolean | Indica sucesso da execução |

**Response 200 — DML:**

```json
{
  "executionId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "rowsAffected": 3,
  "queryType": "DML",
  "success": true
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `executionId` | string (UUID) | Identificador único da execução |
| `rowsAffected` | integer | Número de linhas afetadas (`TCSqlAffected()`) |
| `queryType` | string | Tipo detectado |
| `success` | boolean | Indica sucesso da execução |

**Códigos de Erro:**

| HTTP | Código | Descrição |
|------|--------|-----------|
| 400 | `INVALID_REQUEST` | JSON malformado ou campos obrigatórios ausentes |
| 401 | `INVALID_TOKEN` | Token JWT inválido ou ausente |
| 403 | `PERMISSION_DENIED` | Role insuficiente para o tipo de query |
| 422 | `SQL_EXECUTION_ERROR` | Erro na execução do SQL |
| 429 | `RATE_LIMIT_EXCEEDED` | Limite de 60 req/min excedido |
| 500 | `INTERNAL_ERROR` | Erro interno do servidor |

```json
// 403 — Role insuficiente para DDL
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Execução de DDL requer permissão PQIDE_ADMIN"
  }
}

// 422 — Erro de SQL
{
  "error": {
    "code": "SQL_EXECUTION_ERROR",
    "message": "Erro ao executar query",
    "dbError": "[Invalid column name 'A1_INEXISTENTE']"
  }
}

// 429 — Rate limit
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Limite de 60 requisições por minuto excedido"
  }
}
```

---

### 3.3 Histórico

#### `GET /history`

Lista o histórico de execuções do usuário autenticado, com paginação e filtros.

**Autenticação:** Obrigatória

**Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|:-----------:|-----------|
| `page` | integer | Não | Número da página (padrão: 1) |
| `pageSize` | integer | Não | Itens por página (padrão: 20, máximo: 100) |
| `status` | string | Não | Filtrar por status: `S` (sucesso), `E` (erro) |
| `database` | string | Não | Filtrar por banco: `default`, `oracle`, `postgres` |
| `queryType` | string | Não | Filtrar por tipo: `SELECT`, `DML`, `DDL` |
| `dateFrom` | string | Não | Data inicial (formato `YYYY-MM-DD`) |
| `dateTo` | string | Não | Data final (formato `YYYY-MM-DD`) |

**Exemplo:** `GET /api/pqide/v1/history?page=1&pageSize=10&database=default&status=S`

**Response 200:**

```json
{
  "data": [
    {
      "id": "h1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "sql": "SELECT * FROM SA1010 WHERE D_E_L_E_T_ = ' '",
      "database": "default",
      "company": "01",
      "branch": "01",
      "queryType": "SELECT",
      "status": "S",
      "rowCount": 42,
      "executionTimeMs": 187,
      "executedAt": "2026-03-21T14:30:00Z",
      "error": null
    },
    {
      "id": "h2b3c4d5-e6f7-8901-bcde-f12345678901",
      "sql": "UPDATE SB1010 SET B1_DESC = 'NOVO' WHERE B1_COD = 'X'",
      "database": "default",
      "company": "01",
      "branch": "01",
      "queryType": "DML",
      "status": "E",
      "rowCount": 0,
      "executionTimeMs": 45,
      "executedAt": "2026-03-21T14:25:00Z",
      "error": "String or binary data would be truncated"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 156,
    "totalPages": 16
  }
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `data[].id` | string (UUID) | Identificador único do registro de histórico |
| `data[].sql` | string | SQL executado |
| `data[].database` | string | ID da conexão utilizada |
| `data[].company` | string | Código da empresa |
| `data[].branch` | string | Código da filial |
| `data[].queryType` | string | Tipo da query (`SELECT`, `DML`, `DDL`) |
| `data[].status` | string | `S` = sucesso, `E` = erro |
| `data[].rowCount` | integer | Linhas retornadas ou afetadas |
| `data[].executionTimeMs` | integer | Tempo de execução em ms |
| `data[].executedAt` | string (ISO 8601) | Data/hora da execução |
| `data[].error` | string \| null | Mensagem de erro (quando `status` = `E`) |
| `pagination.page` | integer | Página atual |
| `pagination.pageSize` | integer | Itens por página |
| `pagination.totalItems` | integer | Total de registros |
| `pagination.totalPages` | integer | Total de páginas |

**Códigos de Erro:**

| HTTP | Código | Descrição |
|------|--------|-----------|
| 401 | `INVALID_TOKEN` | Token JWT inválido ou ausente |
| 400 | `INVALID_PARAMETER` | Parâmetro de paginação ou filtro inválido |

---

#### `GET /history/{id}`

Retorna os detalhes de uma execução específica do histórico.

**Autenticação:** Obrigatória

**Path Parameters:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | string (UUID) | Identificador do registro de histórico |

**Exemplo:** `GET /api/pqide/v1/history/h1a2b3c4-d5e6-7890-abcd-ef1234567890`

**Response 200:**

```json
{
  "id": "h1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "sql": "SELECT * FROM SA1010 WHERE D_E_L_E_T_ = ' '",
  "database": "default",
  "company": "01",
  "branch": "01",
  "queryType": "SELECT",
  "status": "S",
  "rowCount": 42,
  "executionTimeMs": 187,
  "executedAt": "2026-03-21T14:30:00Z",
  "error": null
}
```

**Códigos de Erro:**

| HTTP | Código | Descrição |
|------|--------|-----------|
| 401 | `INVALID_TOKEN` | Token JWT inválido ou ausente |
| 404 | `NOT_FOUND` | Registro de histórico não encontrado |

```json
// 404 — Registro não encontrado
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Registro de histórico não encontrado"
  }
}
```

---

#### `DELETE /history/{id}`

Realiza soft-delete de um item do histórico. O registro não é removido fisicamente — o campo `HIS_DELETED` é marcado com `'S'`.

**Autenticação:** Obrigatória

**Path Parameters:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | string (UUID) | Identificador do registro de histórico |

**Exemplo:** `DELETE /api/pqide/v1/history/h1a2b3c4-d5e6-7890-abcd-ef1234567890`

**Response 200:**

```json
{
  "success": true,
  "message": "Item do histórico removido"
}
```

**Códigos de Erro:**

| HTTP | Código | Descrição |
|------|--------|-----------|
| 401 | `INVALID_TOKEN` | Token JWT inválido ou ausente |
| 404 | `NOT_FOUND` | Registro de histórico não encontrado |

---

### 3.4 Favoritos

#### `GET /favorites`

Lista os favoritos (queries salvas) do usuário autenticado.

**Autenticação:** Obrigatória

**Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|:-----------:|-----------|
| `search` | string | Não | Busca por nome ou descrição (LIKE) |
| `database` | string | Não | Filtrar por banco |

**Exemplo:** `GET /api/pqide/v1/favorites?database=default&search=clientes`

**Response 200:**

```json
[
  {
    "id": "f1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "name": "Clientes Ativos SP",
    "description": "Lista clientes ativos do estado de São Paulo",
    "sql": "SELECT A1_COD, A1_NOME, A1_MUN FROM SA1010 WHERE A1_EST = 'SP' AND D_E_L_E_T_ = ' '",
    "database": "default",
    "createdAt": "2026-03-15T10:00:00Z",
    "updatedAt": "2026-03-20T16:45:00Z"
  },
  {
    "id": "f2b3c4d5-e6f7-8901-bcde-f12345678901",
    "name": "Produtos sem Estoque",
    "description": null,
    "sql": "SELECT B1_COD, B1_DESC FROM SB1010 WHERE B1_ESTFOR = ' ' AND D_E_L_E_T_ = ' '",
    "database": "default",
    "createdAt": "2026-03-18T09:30:00Z",
    "updatedAt": null
  }
]
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string (UUID) | Identificador único do favorito |
| `name` | string | Nome do favorito |
| `description` | string \| null | Descrição opcional |
| `sql` | string | SQL salvo |
| `database` | string | ID da conexão associada |
| `createdAt` | string (ISO 8601) | Data de criação |
| `updatedAt` | string (ISO 8601) \| null | Data da última alteração |

**Códigos de Erro:**

| HTTP | Código | Descrição |
|------|--------|-----------|
| 401 | `INVALID_TOKEN` | Token JWT inválido ou ausente |

---

#### `POST /favorites`

Cria um novo favorito (query salva).

**Autenticação:** Obrigatória

**Request Body:**

```json
{
  "name": "Clientes Ativos SP",
  "description": "Lista clientes ativos do estado de São Paulo",
  "sql": "SELECT A1_COD, A1_NOME, A1_MUN FROM SA1010 WHERE A1_EST = 'SP' AND D_E_L_E_T_ = ' '",
  "database": "default"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| `name` | string | Sim | Nome do favorito (máx. 100 caracteres) |
| `description` | string | Não | Descrição (máx. 500 caracteres) |
| `sql` | string | Sim | SQL a ser salvo |
| `database` | string | Sim | ID da conexão associada |

**Response 201:**

```json
{
  "id": "f1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "name": "Clientes Ativos SP",
  "description": "Lista clientes ativos do estado de São Paulo",
  "sql": "SELECT A1_COD, A1_NOME, A1_MUN FROM SA1010 WHERE A1_EST = 'SP' AND D_E_L_E_T_ = ' '",
  "database": "default",
  "createdAt": "2026-03-21T14:30:00Z",
  "updatedAt": null
}
```

**Códigos de Erro:**

| HTTP | Código | Descrição |
|------|--------|-----------|
| 400 | `INVALID_REQUEST` | JSON malformado ou campos obrigatórios ausentes |
| 401 | `INVALID_TOKEN` | Token JWT inválido ou ausente |
| 409 | `DUPLICATE_NAME` | Já existe um favorito com este nome para o usuário |

```json
// 409 — Nome duplicado
{
  "error": {
    "code": "DUPLICATE_NAME",
    "message": "Já existe um favorito com o nome 'Clientes Ativos SP'"
  }
}
```

---

#### `PUT /favorites/{id}`

Atualiza um favorito existente.

**Autenticação:** Obrigatória

**Path Parameters:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | string (UUID) | Identificador do favorito |

**Request Body:**

```json
{
  "name": "Clientes Ativos SP (Atualizado)",
  "description": "Lista clientes ativos do estado de São Paulo — com filtro adicional",
  "sql": "SELECT A1_COD, A1_NOME, A1_MUN FROM SA1010 WHERE A1_EST = 'SP' AND A1_MSBLQL != '1' AND D_E_L_E_T_ = ' '",
  "database": "default"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| `name` | string | Sim | Nome do favorito (máx. 100 caracteres) |
| `description` | string | Não | Descrição (máx. 500 caracteres) |
| `sql` | string | Sim | SQL atualizado |
| `database` | string | Sim | ID da conexão associada |

**Exemplo:** `PUT /api/pqide/v1/favorites/f1a2b3c4-d5e6-7890-abcd-ef1234567890`

**Response 200:**

```json
{
  "id": "f1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "name": "Clientes Ativos SP (Atualizado)",
  "description": "Lista clientes ativos do estado de São Paulo — com filtro adicional",
  "sql": "SELECT A1_COD, A1_NOME, A1_MUN FROM SA1010 WHERE A1_EST = 'SP' AND A1_MSBLQL != '1' AND D_E_L_E_T_ = ' '",
  "database": "default",
  "createdAt": "2026-03-21T14:30:00Z",
  "updatedAt": "2026-03-21T15:10:00Z"
}
```

**Códigos de Erro:**

| HTTP | Código | Descrição |
|------|--------|-----------|
| 400 | `INVALID_REQUEST` | JSON malformado ou campos obrigatórios ausentes |
| 401 | `INVALID_TOKEN` | Token JWT inválido ou ausente |
| 404 | `NOT_FOUND` | Favorito não encontrado |
| 409 | `DUPLICATE_NAME` | Já existe outro favorito com este nome |

---

#### `DELETE /favorites/{id}`

Remove permanentemente um favorito.

**Autenticação:** Obrigatória

**Path Parameters:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | string (UUID) | Identificador do favorito |

**Exemplo:** `DELETE /api/pqide/v1/favorites/f1a2b3c4-d5e6-7890-abcd-ef1234567890`

**Response 200:**

```json
{
  "success": true,
  "message": "Favorito removido"
}
```

**Códigos de Erro:**

| HTTP | Código | Descrição |
|------|--------|-----------|
| 401 | `INVALID_TOKEN` | Token JWT inválido ou ausente |
| 404 | `NOT_FOUND` | Favorito não encontrado |

---

### 3.5 Exportação

#### `POST /export`

Gera e retorna um arquivo de exportação (XLSX ou CSV) a partir de uma execução de query anterior.

**Autenticação:** Obrigatória

**Request Body:**

```json
{
  "executionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "format": "xlsx",
  "includeHeaders": true
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| `executionId` | string (UUID) | Sim | ID da execução obtido de `POST /query/execute` |
| `format` | string | Sim | Formato do arquivo: `xlsx` ou `csv` |
| `includeHeaders` | boolean | Não | Incluir cabeçalhos das colunas (padrão: `true`) |

**Response 200:**

O conteúdo do arquivo é retornado diretamente no body da response com o header `Content-Disposition` apropriado.

```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="export_a1b2c3d4.xlsx"
```

| Formato | Content-Type |
|---------|--------------|
| `xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `csv` | `text/csv; charset=utf-8` |

**Códigos de Erro:**

| HTTP | Código | Descrição |
|------|--------|-----------|
| 400 | `INVALID_REQUEST` | JSON malformado ou formato inválido |
| 401 | `INVALID_TOKEN` | Token JWT inválido ou ausente |
| 404 | `EXECUTION_NOT_FOUND` | Execução não encontrada ou dados expirados |
| 422 | `EXPORT_ERROR` | Erro ao gerar o arquivo de exportação |

```json
// 404 — Execução não encontrada
{
  "error": {
    "code": "EXECUTION_NOT_FOUND",
    "message": "Execução não encontrada ou dados expirados"
  }
}
```

---

### 3.6 Schema

#### `GET /schema/tables`

Lista as tabelas disponíveis no banco selecionado. Utiliza introspecção nativa do AppServer.

**Autenticação:** Obrigatória

**Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|:-----------:|-----------|
| `database` | string | Sim | ID da conexão (`default`, `oracle`, `postgres`) |
| `search` | string | Não | Filtro por nome da tabela (LIKE) |

**Exemplo:** `GET /api/pqide/v1/schema/tables?database=default&search=SA1`

**Response 200:**

```json
[
  {
    "name": "SA1010",
    "description": "Clientes"
  },
  {
    "name": "SA2010",
    "description": "Fornecedores"
  },
  {
    "name": "SA3010",
    "description": "Vendedores"
  }
]
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `name` | string | Nome real da tabela no banco |
| `description` | string | Descrição da tabela (quando disponível) |

**Códigos de Erro:**

| HTTP | Código | Descrição |
|------|--------|-----------|
| 400 | `INVALID_REQUEST` | Parâmetro `database` ausente |
| 401 | `INVALID_TOKEN` | Token JWT inválido ou ausente |
| 422 | `SCHEMA_ERROR` | Erro ao consultar metadados do banco |

---

#### `GET /schema/columns`

Lista as colunas de uma tabela específica.

**Autenticação:** Obrigatória

**Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|:-----------:|-----------|
| `database` | string | Sim | ID da conexão (`default`, `oracle`, `postgres`) |
| `table` | string | Sim | Nome da tabela |

**Exemplo:** `GET /api/pqide/v1/schema/columns?database=default&table=SA1010`

**Response 200:**

```json
[
  {
    "name": "A1_COD",
    "type": "C",
    "size": 6,
    "dec": 0,
    "nullable": false,
    "description": "Código do Cliente"
  },
  {
    "name": "A1_NOME",
    "type": "C",
    "size": 40,
    "dec": 0,
    "nullable": false,
    "description": "Razão Social"
  },
  {
    "name": "A1_EST",
    "type": "C",
    "size": 2,
    "dec": 0,
    "nullable": false,
    "description": "Estado"
  },
  {
    "name": "A1_VEND",
    "type": "C",
    "size": 6,
    "dec": 0,
    "nullable": true,
    "description": "Código do Vendedor"
  }
]
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `name` | string | Nome da coluna |
| `type` | string | Tipo Protheus (`C`, `N`, `D`, `L`, `M`) |
| `size` | integer | Tamanho do campo |
| `dec` | integer | Casas decimais (para campos numéricos) |
| `nullable` | boolean | Se a coluna aceita valores nulos |
| `description` | string | Descrição da coluna (dicionário de dados) |

**Códigos de Erro:**

| HTTP | Código | Descrição |
|------|--------|-----------|
| 400 | `INVALID_REQUEST` | Parâmetros `database` ou `table` ausentes |
| 401 | `INVALID_TOKEN` | Token JWT inválido ou ausente |
| 404 | `TABLE_NOT_FOUND` | Tabela não encontrada no banco |
| 422 | `SCHEMA_ERROR` | Erro ao consultar metadados do banco |

```json
// 404 — Tabela não encontrada
{
  "error": {
    "code": "TABLE_NOT_FOUND",
    "message": "Tabela 'XYZ010' não encontrada"
  }
}
```

---

## 4. Resumo de Códigos de Erro Globais

| HTTP | Código | Descrição | Onde |
|------|--------|-----------|------|
| 400 | `INVALID_REQUEST` | JSON malformado ou campos inválidos | Todos os endpoints |
| 401 | `MISSING_TOKEN` | Header Authorization ausente | Todos os endpoints |
| 401 | `INVALID_TOKEN` | Token JWT inválido ou expirado | Todos os endpoints |
| 403 | `ACCESS_DENIED` | Sem acesso ao módulo PQIDE | Todos os endpoints |
| 403 | `PERMISSION_DENIED` | Role insuficiente para a operação | `POST /query/execute` |
| 404 | `NOT_FOUND` | Recurso não encontrado | `GET/DELETE /history/{id}`, `PUT/DELETE /favorites/{id}` |
| 404 | `TABLE_NOT_FOUND` | Tabela não existe no banco | `GET /schema/columns` |
| 404 | `EXECUTION_NOT_FOUND` | Execução não encontrada | `POST /export` |
| 409 | `DUPLICATE_NAME` | Nome de favorito duplicado | `POST /favorites`, `PUT /favorites/{id}` |
| 422 | `SQL_EXECUTION_ERROR` | Erro nativo do banco (`TCSqlError()`) | `POST /query/execute` |
| 422 | `EXPORT_ERROR` | Erro ao gerar arquivo de exportação | `POST /export` |
| 422 | `SCHEMA_ERROR` | Erro ao consultar metadados | `GET /schema/tables`, `GET /schema/columns` |
| 429 | `RATE_LIMIT_EXCEEDED` | Limite de 60 req/min excedido | Todos os endpoints |
| 500 | `INTERNAL_ERROR` | Erro interno não tratado | Todos os endpoints |

---

## 5. Modelo de Dados — Tabelas de Persistência

### PQHIST — Histórico

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `HIS_ID` | CHAR(36) | UUID (PK) |
| `HIS_EMPRESA` | CHAR(2) | Código da empresa |
| `HIS_FILIAL` | CHAR(2) | Código da filial |
| `HIS_USUARIO` | CHAR(20) | Usuário que executou |
| `HIS_DTEXEC` | DATETIME | Data/hora da execução |
| `HIS_BANCO` | CHAR(20) | ID da conexão utilizada |
| `HIS_SQL` | TEXT | SQL executado |
| `HIS_TIPO` | CHAR(10) | Tipo: `SELECT`, `DML`, `DDL` |
| `HIS_ROWS` | INTEGER | Linhas retornadas/afetadas |
| `HIS_TEMPO` | INTEGER | Tempo de execução (ms) |
| `HIS_STATUS` | CHAR(1) | `S` = sucesso, `E` = erro |
| `HIS_ERRO` | TEXT | Mensagem de erro (quando status = `E`) |
| `HIS_DELETED` | CHAR(1) | Soft-delete: `' '` = ativo, `'S'` = removido |

### PQFAVS — Favoritos

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `FAV_ID` | CHAR(36) | UUID (PK) |
| `FAV_EMPRESA` | CHAR(2) | Código da empresa |
| `FAV_USUARIO` | CHAR(20) | Usuário proprietário |
| `FAV_NOME` | VARCHAR(100) | Nome do favorito |
| `FAV_DESC` | VARCHAR(500) | Descrição |
| `FAV_SQL` | TEXT | SQL salvo |
| `FAV_BANCO` | CHAR(20) | ID da conexão associada |
| `FAV_DTCRI` | DATETIME | Data de criação |
| `FAV_DTALT` | DATETIME | Data da última alteração |
| `FAV_DELETED` | CHAR(1) | Soft-delete: `' '` = ativo, `'S'` = removido |

### PQAUDT — Auditoria

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `AUD_ID` | CHAR(36) | UUID (PK) |
| `AUD_HISTID` | CHAR(36) | Referência ao histórico (FK opcional) |
| `AUD_EMPRESA` | CHAR(2) | Código da empresa |
| `AUD_USUARIO` | CHAR(20) | Usuário |
| `AUD_IP` | VARCHAR(45) | IP de origem |
| `AUD_DTLOG` | DATETIME | Data/hora do evento |
| `AUD_ACAO` | CHAR(20) | Ação executada |
| `AUD_DETALHE` | TEXT | Detalhes (SQL, erro, etc.) |

---

## 6. Observações Técnicas

- **Rate Limiting:** 60 requisições por minuto por usuário, controlado pelo `RateLimitMiddleware`
- **Timeout:** configurável por request no campo `timeout` (padrão 30s), aplicado via `TCSqlOpen()`
- **Limite de Linhas:** aplicado server-side via `SqlDialectHelper` — `TOP` (SQL Server), `LIMIT` (PostgreSQL), `FETCH FIRST` (Oracle)
- **Normalização de Dialeto:** `TCGenQry()` normaliza o SQL para o dialeto do banco ativo antes da execução
- **Single Statement:** apenas um statement SQL por request — ponto e vírgula no meio do SQL é bloqueado por `ValidateSqlInput()`
- **Conexões Externas:** `MsConnect()`/`MsDisconnect()` gerenciados automaticamente no bloco `Finally`
- **Persistência:** tabelas `PQHIST`, `PQFAVS` e `PQAUDT` são sempre gravadas na conexão padrão do Protheus

---

*Versão: 1.1 — Execução via AppServer nativo (TCQuery / TCSqlExec / MsConnect). Sem pool independente ou drivers externos.*
