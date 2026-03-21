# Constitution — ProtheusQuery IDE
> Documento fundacional do projeto. Define visão, princípios, restrições e decisões inegociáveis.

---

## 1. Visão do Produto

O **ProtheusQuery IDE** é uma aplicação web embarcada no ecossistema Totvs Protheus que permite a administradores de sistema executar, salvar, historiar e exportar queries SQL diretamente nos bancos de dados conectados ao Protheus — com a mesma experiência visual e de autenticação do próprio ERP.

A ferramenta funciona como um **SQL Management Studio contextualizado ao Protheus**: leve, seguro, auditável e integrado ao ciclo de vida do sistema.

---

## 2. Objetivos

| # | Objetivo | Critério de Sucesso |
|---|----------|---------------------|
| O1 | Executar queries SQL nos bancos suportados | Retorno correto de resultados em < 30s para queries padrão |
| O2 | Suportar SQL Server, Oracle e PostgreSQL | Abstração transparente de dialeto SQL por banco |
| O3 | Autenticar via SSO do Protheus | Zero cadastro adicional de usuário; sessão herdada do ERP |
| O4 | Persistir histórico de execuções | Últimas 200 queries por usuário disponíveis sem configuração |
| O5 | Permitir salvar queries favoritas | CRUD completo de favoritos com nome e descrição |
| O6 | Exportar resultados em Excel e CSV | Download direto pelo browser sem intermediário externo |
| O7 | Suportar DML e DDL completos | Permissão gerenciada por papel de administrador do Protheus |
| O8 | Funcionar embarcado no Protheus WebApp | Integração via menu do Protheus sem nova aba ou SSO duplo |

---

## 3. Não-Objetivos (fora de escopo)

- Não é um substituto ao ATENPS ou ao módulo de configuração do Protheus.
- Não expõe acesso a usuários de negócio ou consultores (apenas Administradores de Sistema).
- Não oferece suporte a bancos MySQL/MariaDB nesta versão.
- Não implementa versionamento de schema ou migrations.
- Não possui funcionalidade de agendamento de queries (jobs/schedules).
- Não sincroniza com ferramentas externas de BI ou ETL.

---

## 4. Princípios Inegociáveis

### 4.1 Segurança por padrão
Toda operação destrutiva (UPDATE, DELETE, DROP, ALTER) exige confirmação explícita do usuário. Nenhuma query é executada sem que o token de sessão Protheus seja validado server-side a cada chamada. O acesso ao banco nunca é exposto diretamente ao frontend.

### 4.2 Rastreabilidade total
Toda query executada — incluindo as que falharam — é registrada em log de auditoria com: usuário, timestamp, banco-alvo, SQL completo e resultado (sucesso/erro/linhas afetadas). Logs não podem ser deletados pela aplicação.

### 4.3 Conformidade com o Design System POUI
A interface segue exclusivamente os componentes e tokens do **PO UI** (Totvs). Nenhum componente customizado que quebre a experiência do Protheus será aceito. A consistência visual com o ERP é requisito não-negociável.

### 4.4 Backend TLPP como único ponto de acesso ao banco
O Angular nunca acessa o banco de dados diretamente. Toda conexão, execução e serialização de resultado ocorre no backend TLPP, que atua como gateway seguro e rastreável.

### 4.5 Compatibilidade com o ciclo de release do Protheus
A aplicação deve ser versionada e testada contra as versões LTS do Protheus em uso. Nenhuma dependência externa pode quebrar o build em ambiente Totvs sem workaround documentado.

---

## 5. Restrições Técnicas

| Restrição | Motivo |
|-----------|--------|
| Backend obrigatoriamente em TLPP | Integração nativa com Protheus AppServer e acesso à camada de conexão TDS |
| Frontend obrigatoriamente em Angular + POUI | Padrão Totvs para aplicações embarcadas no WebApp |
| Autenticação exclusivamente via token Protheus | Sem base de usuários própria; herda identidade do ERP |
| Banco de dados da aplicação: mesmo banco do Protheus | Tabelas de histórico e favoritos criadas no schema da empresa ativa |
| Execução de queries via funções nativas TLPP | `TCQuery`, `FWPreparedStatement`, `DBExec` via DBAccess — sem conexões externas ou drivers adicionais |
| Deploy embarcado no AppServer Protheus | Sem containers Docker ou servidores externos independentes |

---

## 6. Stakeholders e Papéis

| Papel | Responsabilidade |
|-------|-----------------|
| Administrador de Sistema | Usuário final da ferramenta; executa queries, gerencia favoritos |
| DBA Totvs | Valida segurança das conexões e queries de alto impacto |
| Equipe de Desenvolvimento | Mantém o código TLPP e Angular; segue este documento |
| Arquiteto de Soluções | Aprova mudanças que afetem restrições técnicas ou princípios |

---

## 7. Definições e Glossário

| Termo | Definição |
|-------|-----------|
| **TLPP** | TOTVS Language Plus Plus — linguagem de programação do Protheus, sucessora do AdvPL |
| **AppServer** | Servidor de aplicação do Protheus que hospeda o backend TLPP |
| **POUI** | PO UI — Design System Angular da Totvs para aplicações Protheus |
| **SmartClient/WebApp** | Interfaces de acesso ao Protheus; o WebApp é o contexto de embed desta aplicação |
| **TConnection** | Classe TLPP para gerenciamento de conexões de banco de dados |
| **TCQuery** | Classe TLPP para execução de queries SQL parametrizadas |
| **SSO Protheus** | Mecanismo de autenticação único via token JWT emitido pelo AppServer |
| **Empresa Ativa** | Contexto de empresa/filial selecionado na sessão Protheus do usuário |

---

## 8. Decisões de Arquitetura (ADRs resumidos)

| ID | Decisão | Alternativa rejeitada | Motivo |
|----|---------|----------------------|--------|
| ADR-01 | Execução via TCQuery/FWPreparedStatement nativos do AppServer | Driver ODBC externo ou conexão independente | Usa o DBAccess já gerenciado pelo Protheus; sem credenciais extras; sem ponto de falha adicional |
| ADR-02 | Frontend Angular + POUI | React/Vue | Padrão oficial Totvs para WebApp embarcado |
| ADR-03 | Histórico no banco Protheus | LocalStorage / IndexedDB | Persistência server-side, auditável e portável entre máquinas |
| ADR-04 | Token JWT herdado do Protheus | Basic Auth próprio | Sem duplicação de identidade; sessão unificada |
| ADR-05 | Confirmação obrigatória para DML/DDL | Execução direta | Prevenção de operações destrutivas acidentais |

---

*Versão: 1.0 | Documento vivo — qualquer alteração de princípios requer aprovação do Arquiteto de Soluções.*
