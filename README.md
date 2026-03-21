# ProtheusQuery IDE

> Aplicação web embarcada no ecossistema Totvs Protheus para execução de queries SQL diretamente nos bancos de dados conectados ao ERP.

[![Protheus](https://img.shields.io/badge/Protheus-12.1+-00A8E0?style=flat-square)](https://www.totvs.com/)
[![Angular](https://img.shields.io/badge/Angular-17+-DD0031?style=flat-square)](https://angular.io/)
[![POUI](https://img.shields.io/badge/POUI-17+-FF6F00?style=flat-square)](https://po-ui.io/)
[![TLPP](https://img.shields.io/badge/TLPP-Native-4CAF50?style=flat-square)](https://www.totvs.com/)

## 📋 Visão Geral

O **ProtheusQuery IDE** é uma ferramenta de administração de banco de dados embarcada no Protheus WebApp que permite a administradores de sistema:

- Executar queries SQL nos bancos de dados conectados ao Protheus
- Salvar queries favoritas para reutilização
- Visualizar histórico de execuções
- Exportar resultados em Excel e CSV
- Suportar múltiplos bancos de dados (SQL Server, Oracle, PostgreSQL)

## ✨ Funcionalidades

| Funcionalidade | Descrição |
|----------------|-----------|
| **Execução de Queries** | SELECT, DML (INSERT/UPDATE/DELETE) e DDL (CREATE/ALTER/DROP) |
| **Editor SQL** | Syntax highlighting, autocomplete e atalhos de teclado |
| **Histórico** | Últimas 200 queries executadas por usuário |
| **Favoritos** | CRUD completo com nome e descrição |
| **Exportação** | Download direto em XLSX e CSV |
| **Multi-Banco** | SQL Server (padrão), Oracle e PostgreSQL |
| **Auditoria** | Log completo de todas as operações em PQAUDT |
| **Segurança** | Autenticação JWT, roles e rate limiting |

## 🏗 Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PROTHEUS WEBAPP                              │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              FRONTEND — Angular 17+ + POUI                    │  │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌───────────────┐  │  │
│  │  │ Query    │ │ Histórico │ │Favoritos │ │  Resultados   │  │  │
│  │  │ Editor   │ │ Panel     │ │ Panel    │  │  Grid/Export  │  │  │
│  │  └──────────┘ └───────────┘ └──────────┘ └───────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS REST (JWT Protheus)
┌──────────────────────────────▼──────────────────────────────────────┐
│                    BACKEND — TLPP REST API                         │
│                     (Protheus AppServer)                           │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │ Auth        │ │ Query        │ │ Histórico    │ │ Export     │ │
│  │ Middleware  │ │ Controller   │ │ Controller   │ │ Controller │ │
│  └─────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│          TLPP Database Layer — AppServer Native                   │
│  TCQuery / TCSqlExec / MsConnect / TCGenQry                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌───────────────┐    ┌──────────────┐    ┌─────────────┐
│  SQL Server   │    │    Oracle    │    │ PostgreSQL  │
│ (Protheus)   │    │ (via alias)  │    │(via alias) │
└───────────────┘    └──────────────┘    └─────────────┘
```

## 🛠 Tecnologias

| Camada | Tecnologia |
|--------|------------|
| Frontend | Angular 17+ |
| UI Framework | POUI (Totvs) |
| Editor SQL | Monaco Editor |
| Backend | TLPP (Protheus AppServer) |
| Banco de Dados | SQL Server, Oracle, PostgreSQL |
| Autenticação | JWT (SSO Protheus) |

## 📋 Pré-Requisitos

| Componente | Versão Mínima |
|-----------|---------------|
| Protheus AppServer | 12.1.2310 |
| TOTVS WebApp | 12.1.2310 |
| Node.js (build) | 18 LTS |
| Angular CLI | 17+ |

## 📁 Estrutura do Projeto

```
protheus-query-ide/
├── docs/                          # Documentação do projeto
│   ├── architecture.md           # Arquitetura técnica
│   ├── constitution.md           # Visão e princípios
│   ├── design.md                 # Especificação de UI/UX
│   ├── security.md               # Modelo de segurança
│   ├── orchestrator.md           # Integração e fluxos
│   └── implementation-plan.md   # Plano de implementação
│
├── frontend/                     # Aplicação Angular (futuro)
│   └── src/
│
└── backend/                      # Fontes TLPP (futuro)
    └── src/
```

## 🚀 Início Rápido

### 1. Clonar o Repositório

```bash
git clone https://github.com/seu-org/protheus-query-ide.git
cd protheus-query-ide
```

### 2. Configurar Ambiente de Desenvolvimento

#### Backend (TLPP)

1. Configure o AppServer de desenvolvimento
2. Copie os fontes TLPP para o diretório de fontes do AppServer
3. Configure as aliases de banco no `AppServer.ini`:

```ini
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

4. Crie as tabelas de persistência no banco Protheus:

```sql
CREATE TABLE PQHIST (
  HIS_ID        CHAR(36)     NOT NULL,
  HIS_EMPRESA   CHAR(2)      NOT NULL,
  HIS_FILIAL    CHAR(2)      NOT NULL,
  HIS_USUARIO   CHAR(20)     NOT NULL,
  HIS_DTEXEC    DATETIME     NOT NULL,
  HIS_BANCO     CHAR(20)     NOT NULL,
  HIS_SQL       TEXT         NOT NULL,
  HIS_TIPO      CHAR(10)     NOT NULL,
  HIS_ROWS      INTEGER      DEFAULT 0,
  HIS_TEMPO     INTEGER      DEFAULT 0,
  HIS_STATUS    CHAR(1)      NOT NULL,
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

#### Frontend (Angular)

```bash
cd frontend
npm install
npm start
```

### 3. Configurar no Protheus

1. Configure o menu via SIGACFG:
   - Adicionar: "ProtheusQuery IDE" → Programa: PQIDEAPP

2. Configure os grupos de acesso no SIGACFG:
   - Criar grupo `PQIDE_ADMIN` para administradores
   - Criar grupo `PQIDE_OPERATOR` para operadores
   - Criar grupo `PQIDE_VIEWER` para visualizadores

## 📖 Documentação

| Documento | Descrição |
|-----------|-----------|
| [Constitution](docs/constitution.md) | Visão, princípios, objetivos e restrições |
| [Architecture](docs/architecture.md) | Arquitetura técnica detalhada |
| [Design](docs/design.md) | Especificação de UX/UI com POUI |
| [Security](docs/security.md) | Modelo de segurança completo |
| [Orchestrator](docs/orchestrator.md) | Integração, fluxos e guia de implantação |
| [Implementation Plan](docs/implementation-plan.md) | Plano faseado de desenvolvimento |

## 🔐 Segurança

- ✅ Autenticação via JWT do Protheus
- ✅ Autorização server-side por roles
- ✅ Confirmação obrigatória para DML/DDL
- ✅ Auditoria completa em PQAUDT
- ✅ Rate limiting (60 req/min por usuário)
- ✅ Validação de SQL para bloquear comandos perigosos

Consulte o documento [Security](docs/security.md) para detalhes completos.

## 📄 Licença

Copyright © 2026. Todos os direitos reservados.

---

*ProtheusQuery IDE — Uma ferramenta de administração de banco de dados para o ecossistema Protheus.*
