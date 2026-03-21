# Guia de Deploy — ProtheusQuery IDE
> Procedimento completo de implantação do ProtheusQuery IDE no ecossistema Protheus AppServer.
> **v1.0 — Angular 17 + TLPP REST nativo**

---

## 1. Pré-Requisitos de Ambiente

### 1.1 Infraestrutura

| Componente | Versão Mínima | Obrigatório | Observação |
|-----------|---------------|:-----------:|-----------|
| Protheus AppServer | 12.1.2310 | Sim | Suporte a TLPP e REST nativo |
| TOTVS WebApp | 12.1.2310 | Sim | Para servir o build Angular embarcado |
| SQL Server | 2016+ | Sim | Banco padrão do Protheus (conexão default) |
| Oracle | 12c+ | Opcional | Acesso via alias `DB_ORACLE` no AppServer.ini |
| PostgreSQL | 12+ | Opcional | Acesso via alias `DB_POSTGRES` no AppServer.ini |

### 1.2 Ferramentas de Build (não permanecem em produção)

| Ferramenta | Versão Mínima | Finalidade |
|-----------|---------------|-----------|
| Node.js | 18 LTS | Instalação de dependências e build do Angular |
| Angular CLI | 17+ | Compilação do frontend |
| TOTVS Developer Studio | compatível com AppServer | Compilação dos fontes TLPP |
| SQL Server Management Studio (ou equivalente) | — | Execução dos scripts de criação de tabelas |

### 1.3 Acesso e Permissões Necessários

- Acesso ao diretório de instalação do AppServer (`/appserver/`)
- Permissão de escrita em `/appserver/web/` (frontend Angular)
- Permissão de escrita em `/appserver/tlpp/` (fontes TLPP)
- Acesso ao banco de dados da empresa ativa para executar scripts SQL
- Permissão para editar `AppServer.ini`
- Permissão para reiniciar o serviço do AppServer
- Acesso administrativo ao SIGACFG (menu e grupos de acesso)

---

## 2. Instalação e Configuração

### 2.1 Build do Frontend Angular

O build deve ser executado em uma máquina com Node.js 18+ instalado.

```bash
# Entrar no diretório do frontend
cd frontend/

# Instalar dependências
npm install

# Build de produção com base-href correto para o WebApp
ng build --configuration production --base-href /pqide/
```

O output do build será gerado em `frontend/dist/frontend/browser/`.

Conteúdo gerado:
```
dist/frontend/browser/
├── index.html
├── main-<hash>.js
├── polyfills-<hash>.js
├── styles-<hash>.css
├── assets/
│   └── monaco-editor/    # Editor SQL
└── favicon.ico
```

**Validação do build:**
- O arquivo `index.html` deve conter referências a `main-*.js` e `polyfills-*.js`
- O diretório `assets/monaco-editor/` deve estar presente (syntax highlighting)
- O tamanho total não deve exceder 3MB (conforme budget configurado em `angular.json`)

### 2.2 Cópia de Arquivos para AppServer

Copiar o conteúdo do build Angular para o diretório Web do AppServer:

```bash
# Criar diretório de destino (se não existir)
mkdir -p /appserver/web/pqide/

# Copiar build Angular
cp -r frontend/dist/frontend/browser/* /appserver/web/pqide/
```

**Estrutura final no AppServer:**
```
/appserver/web/pqide/
├── index.html
├── main-<hash>.js
├── polyfills-<hash>.js
├── styles-<hash>.css
├── assets/
│   └── monaco-editor/
└── favicon.ico
```

### 2.3 Compilação de Fontes TLPP

Copiar os fontes TLPP para o diretório de programas do AppServer:

```bash
# Criar diretório de destino (se não existir)
mkdir -p /appserver/tlpp/pqide/

# Copiar fontes TLPP
cp -r backend/src/* /appserver/tlpp/pqide/
```

**Fontes que serão copiados:**

```
/appserver/tlpp/pqide/
├── controllers/
│   ├── ExportController.tlpp
│   ├── FavoriteController.tlpp
│   ├── HistoryController.tlpp
│   ├── QueryController.tlpp
│   └── SchemaController.tlpp
├── helpers/
│   ├── ConnectionHelper.tlpp
│   ├── LoggerHelper.tlpp
│   ├── ResultSetHelper.tlpp
│   ├── SqlDialectHelper.tlpp
│   └── ValidationHelper.tlpp
├── middleware/
│   ├── AuditMiddleware.tlpp
│   ├── AuthMiddleware.tlpp
│   └── RateLimitMiddleware.tlpp
├── models/
│   ├── FavoriteRecord.tlpp
│   ├── HistoryRecord.tlpp
│   ├── QueryRequest.tlpp
│   └── QueryResult.tlpp
└── services/
    ├── ExportService.tlpp
    ├── FavoriteService.tlpp
    ├── HistoryService.tlpp
    ├── QueryService.tlpp
    └── SchemaService.tlpp
```

Após a cópia, compilar os fontes via **TOTVS Developer Studio**:

1. Abrir o TOTVS Developer Studio
2. Conectar ao AppServer de destino
3. Navegar até `ProtheusQuery IDE` nos fontes
4. Executar **Compilação Completa** de todos os `.tlpp`
5. Verificar se não há erros de compilação no log

> **Alternativa:** Se o ambiente suportar compilação remota, utilize o comando de build do AppServer para compilar todos os fontes de uma vez.

### 2.4 Criação de Tabelas SQL

Executar os scripts SQL na **empresa ativa do Protheus** (conexão padrão do AppServer). Os scripts estão em `backend/sql/`.

**Ordem obrigatória de execução:**

| # | Script | Tabela | Descrição |
|---|--------|--------|-----------|
| 1 | `001_pqhist.sql` | PQHIST | Histórico de execuções de queries |
| 2 | `002_pqfavs.sql` | PQFAVS | Favoritos salvos pelos usuários |
| 3 | `003_pqaudt.sql` | PQAUDT | Auditoria de ações no sistema |

```sql
-- Executar via SQL Server Management Studio ou sqlcmd no banco Protheus:

-- 1. Histórico
:r backend/sql/001_pqhist.sql

-- 2. Favoritos
:r backend/sql/002_pqfavs.sql

-- 3. Auditoria
:r backend/sql/003_pqaudt.sql
```

Cada script verifica se a tabela já existe antes de criá-la (`IF NOT EXISTS`), sendo seguro executar múltiplas vezes.

**Tabelas criadas e seus índices:**

| Tabela | Índices | Propósito |
|--------|---------|-----------|
| PQHIST | `IX_PQHIST_USUARIO`, `IX_PQHIST_DTEXEC`, `IX_PQHIST_EMPRESA` | Histórico de queries executadas |
| PQFAVS | `IX_PQFAVS_USUARIO`, `IX_PQFAVS_EMPRESA`, `IX_PQFAVS_NOME` | Queries favoritas salvas |
| PQAUDT | `IX_PQAUDT_USUARIO`, `IX_PQAUDT_DTLOG`, `IX_PQAUDT_ACAO`, `IX_PQAUDT_HISTID` | Log de auditoria de todas as ações |

**Restrições de acesso às tabelas (aplicação):**

| Tabela | Operações permitidas | Restrição |
|--------|---------------------|-----------|
| PQAUDT | INSERT apenas | Sem DELETE/UPDATE via aplicação |
| PQHIST | INSERT + soft-delete (`HIS_DELETED`) | Sem DELETE físico via aplicação |
| PQFAVS | CRUD completo | Soft-delete; sem DELETE físico |

### 2.5 Configuração de Aliases no AppServer.ini

Editar o arquivo `AppServer.ini` do AppServer de destino para configurar a rota REST e os aliases de banco externo.

**Seção REST (obrigatória):**

```ini
[HTTPREST]
Port=8080
MaxConnections=200
Compression=1

[PQIDE_ROUTE]
Enable=1
URIPrefix=/api/pqide
AllowedHosts=*
```

**Aliases de banco externo (opcionais — configurar apenas os bancos utilizados):**

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

> **Nota:** Os aliases de banco externo são gerenciados pelo DBA/infraestrutura. A aplicação não armazena credenciais — utiliza `MsConnect` nativo do AppServer para conexão.

**Parâmetros recomendados adicionais no AppServer.ini:**

```ini
[General]
; Timeout de request em segundos (compatível com queryTimeoutMax)
HttpTimeout=300

[HTTPREST]
; Habilitar logs de acesso REST para troubleshooting
AccessLog=1
```

### 2.6 Configuração de Menu e Grupos de Acesso no Protheus

#### 2.6.1 Configuração de Menu

Acessar o **SIGACFG** e configurar o menu:

1. Navegar: **SIGACFG → Cadastros → Menus**
2. Adicionar novo item de menu:
   - **Título:** `ProtheusQuery IDE`
   - **Programa:** `PQIDEAPP`
   - **Módulo:** Administrador do Sistema

#### 2.6.2 Configuração de Grupos de Acesso

Navegar: **SIGACFG → Segurança → Grupos de Acesso**

Criar os seguintes grupos e atribuir aos usuários conforme o perfil:

| Grupo | Perfil | Permissões |
|-------|--------|-----------|
| `PQIDE_ADMIN` | Administrador de Sistema | SELECT, DML, DDL, Export, Favoritos, Histórico completo |
| `PQIDE_OPERATOR` | Operador de Banco | SELECT, DML, Export, Favoritos, Histórico |
| `PQIDE_VIEWER` | Visualizador | SELECT apenas, Histórico próprio |

**Regras de permissão:**

- DDL (`CREATE`, `ALTER`, `DROP`) requer grupo `PQIDE_ADMIN`
- DML (`INSERT`, `UPDATE`, `DELETE`) requer grupo `PQIDE_OPERATOR` ou `PQIDE_ADMIN`
- SELECT é permitido para todos os grupos acima
- Exportação requer `PQIDE_OPERATOR` ou `PQIDE_ADMIN`

### 2.7 Reinício do AppServer

Após todas as configurações, reiniciar o AppServer para carregar os novos fontes TLPP e configurações:

```bash
# Windows (serviço)
net stop TOTVSAppServer
net start TOTVSAppServer

# Linux (systemctl)
sudo systemctl restart totvs-appserver
```

---

## 3. Variáveis de Ambiente

### 3.1 Frontend Angular

As variáveis de ambiente do frontend são definidas em `frontend/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: '/api/pqide/v1'
};
```

| Variável | Valor Padrão | Descrição |
|----------|-------------|-----------|
| `production` | `true` | Ativa otimizações de produção (tree-shaking, minificação) |
| `apiUrl` | `/api/pqide/v1` | Prefixo base das chamadas REST ao backend TLPP |

### 3.2 Backend TLPP

O backend TLPP não utiliza variáveis de ambiente externas. A configuração é derivada do `AppServer.ini`:

| Parâmetro | Seção | Descrição |
|-----------|-------|-----------|
| `Port` | `[HTTPREST]` | Porta de escuta REST |
| `URIPrefix` | `[PQIDE_ROUTE]` | Prefixo de rota (`/api/pqide`) |
| `MaxConnections` | `[HTTPREST]` | Máximo de conexões simultâneas |
| `Driver` | `[DBACCESS_*]` | Driver do banco externo (ORACLE, POSTGRES) |
| `Server` | `[DBACCESS_*]` | Endereço do servidor de banco |
| `Alias` | `[DBACCESS_*]` | Nome do alias usado por `MsConnect` |

### 3.3 Constantes de Aplicação

Definidas no código-fonte TLPP (não configuráveis em runtime):

| Constante | Valor | Localização |
|-----------|-------|-------------|
| `MAX_QUERY_ROWS` | 1000 | `QueryService.tlpp` |
| `QUERY_TIMEOUT_DEFAULT` | 30s | `QueryService.tlpp` |
| `QUERY_TIMEOUT_MAX` | 300s | `QueryService.tlpp` |
| `RATE_LIMIT` | 60 req/min | `RateLimitMiddleware.tlpp` |
| `HISTORY_PAGE_SIZE` | 20 | `HistoryService.tlpp` |
| `HISTORY_MAX_ITEMS` | 200 | `HistoryService.tlpp` |

---

## 4. Verificação Pós-Deploy

Executar as seguintes verificações na ordem apresentada após a implantação.

### 4.1 Verificação de Infraestrutura

| # | Verificação | Comando / Ação | Resultado Esperado |
|---|------------|----------------|-------------------|
| 1 | AppServer rodando | `sc query TOTVSAppServer` (Windows) ou `systemctl status totvs-appserver` (Linux) | STATUS: RUNNING |
| 2 | Porta REST respondendo | `curl -I http://<host>:8080/api/pqide/` | HTTP 401 (sem JWT — comportamento esperado) |
| 3 | Build Angular acessível | Abrir `http://<host>:8080/pqide/` no navegador | Tela de login/carregamento do Angular |
| 4 | Arquivos TLPP compilados | Verificar logs do AppServer na inicialização | Sem erros de load de `.tlpp` |

### 4.2 Verificação de Tabelas

```sql
-- Verificar existência das 3 tabelas
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME IN ('PQHIST', 'PQFAVS', 'PQAUDT');

-- Resultado esperado: 3 linhas

-- Verificar índices
SELECT TABLE_NAME, INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_NAME IN ('PQHIST', 'PQFAVS', 'PQAUDT');

-- Resultado esperado: 10 índices
```

### 4.3 Verificação de Aliases

No AppServer, testar a conectividade com os aliases externos:

1. Acessar o console do AppServer
2. Executar teste de `MsConnect` para cada alias configurado:
   - `DB_ORACLE` (se configurado)
   - `DB_POSTGRES` (se configurado)
3. Verificar que `MsConnect` retorna sucesso e `MsDisconnect` encerra corretamente

### 4.4 Verificação Funcional

| # | Teste | Passos | Resultado Esperado |
|---|-------|--------|-------------------|
| 1 | Login | Acessar o IDE via Protheus WebApp | Tela do editor SQL carregada |
| 2 | SELECT simples | Executar `SELECT 1` no banco padrão | Resultado exibido na grid |
| 3 | Histórico | Executar query e verificar painel de histórico | Query registrada em PQHIST |
| 4 | Favorito | Salvar uma query como favorita | Registro criado em PQFAVS |
| 5 | Exportação | Exportar resultado em XLSX | Download do arquivo `.xlsx` |
| 6 | Auditoria | Verificar PQAUDT após execução | Registro de `EXECUTE` presente |
| 7 | DDL (se aplicável) | Executar `CREATE TABLE` com usuário ADMIN | Confirmação exibida; execução bem-sucedida |
| 8 | Aliases externos | Selecionar banco Oracle/Postgres no select | Conexão estabelecida; query executada |
| 9 | Rate limiting | Executar > 60 requisições em 1 min | HTTP 429 retornado |

### 4.5 Verificação de Segurança

| # | Teste | Resultado Esperado |
|---|-------|-------------------|
| 1 | Requisição sem JWT | HTTP 401 |
| 2 | Requisição com JWT expirado | HTTP 401 |
| 3 | DDL com usuário sem `PQIDE_ADMIN` | HTTP 403 |
| 4 | DML com usuário sem `PQIDE_OPERATOR` | HTTP 403 |
| 5 | SQL com `EXEC xp_cmdshell` | HTTP 400 (bloqueado por ValidateSqlInput) |
| 6 | SQL com múltiplos statements (`;`) | HTTP 400 (bloqueado por ValidateSqlInput) |

---

## 5. Procedimento de Rollback

### 5.1 Quando Executar

Executar rollback em caso de:
- Erro crítico de compilação TLPP
- Falha na inicialização do AppServer após deploy
- Erro de acesso às tabelas (constraints, índices corrompidos)
- Degradation de performance significativa
- Falha nas verificações pós-deploy

### 5.2 Procedimento Passo a Passo

```
1. Parar o AppServer
   > net stop TOTVSAppServer

2. Restaurar backup dos fontes TLPP anteriores
   > rm -rf /appserver/tlpp/pqide/
   > cp -r /backup/tlpp/pqide/ /appserver/tlpp/pqide/

3. Restaurar build Angular anterior
   > rm -rf /appserver/web/pqide/
   > cp -r /backup/web/pqide/ /appserver/web/pqide/

4. Restaurar AppServer.ini anterior (se seções foram alteradas)
   > cp /backup/AppServer.ini /appserver/AppServer.ini

5. Reiniciar AppServer
   > net start TOTVSAppServer

6. Executar verificações pós-deploy (seção 4)
```

### 5.3 Itens que NÃO sofrem Rollback

| Item | Motivo |
|------|--------|
| Tabelas PQHIST/PQFAVS/PQAUDT | Dados acumulados são preservados; não há destruição de dados |
| Registros de auditoria em PQAUDT | Logs são imutáveis por design |
| Grupos de acesso no SIGACFG | Configuração do Protheus é gerida separadamente |

### 5.4 Checklist de Rollback

- [ ] AppServer parado
- [ ] Backup dos fontes TLPP restaurado em `/appserver/tlpp/pqide/`
- [ ] Backup do build Angular restaurado em `/appserver/web/pqide/`
- [ ] `AppServer.ini` restaurado (se alterado)
- [ ] AppServer reiniciado com sucesso
- [ ] Verificações pós-deploy executadas e validadas
- [ ] Incidente documentado com causa raiz
- [ ] Equipe comunicada sobre o rollback

### 5.5 Criação de Backup Pré-Deploy

Antes de cada deploy, criar backup dos artefatos atuais:

```bash
# Criar diretório de backup com timestamp
BACKUP_DIR="/backup/pqide/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup dos fontes TLPP
cp -r /appserver/tlpp/pqide/ "$BACKUP_DIR/tlpp/"

# Backup do build Angular
cp -r /appserver/web/pqide/ "$BACKUP_DIR/web/"

# Backup do AppServer.ini
cp /appserver/AppServer.ini "$BACKUP_DIR/AppServer.ini"

echo "Backup criado em: $BACKUP_DIR"
```

---

*Versão: 1.0 — ProtheusQuery IDE. Angular 17 + TLPP REST nativo via AppServer Protheus 12.1.2310+.*
