# Security — ProtheusQuery IDE
> Especificação completa do modelo de segurança: autenticação, autorização, proteção de dados, auditoria e resposta a incidentes.
> **v1.1 — Modelo de segurança ajustado para execução via AppServer nativo (sem pqide_user separado)**

---

## 1. Modelo de Ameaças (Threat Model)

### 1.1 Ativos a Proteger

| Ativo | Criticidade | Descrição |
|-------|-------------|-----------|
| Conexão do AppServer ao banco | 🔴 Crítica | O AppServer já tem acesso total ao banco Protheus; a app herda esse acesso |
| Token de sessão JWT | 🔴 Crítica | Permite executar queries em nome do usuário |
| Dados acessados via query | 🔴 Crítica | Qualquer tabela do banco Protheus é acessível |
| Log de auditoria (PQAUDT) | 🟠 Alta | Evidência de todas as operações realizadas |
| Queries salvas (favoritos) | 🟡 Média | Podem revelar lógica de negócio ou dados sensíveis |
| Histórico de execuções | 🟡 Média | SQL armazenado pode expor estrutura e dados |

### 1.2 Implicação de Usar a Conexão do AppServer

> **Atenção:** Como as queries são executadas via `TCQuery`/`TCSqlExec` usando a conexão do próprio AppServer, elas **possuem os mesmos privilégios de banco que o usuário configurado no AppServer.ini do Protheus**. Tipicamente esse usuário tem acesso amplo ao banco.
>
> Isso significa que a **camada de autorização da aplicação é a única barreira** entre o administrador e o banco. A arquitetura compensa isso com: autenticação obrigatória, controle de roles no AppServer, confirmação explícita de DML/DDL e auditoria total.

### 1.3 Vetores de Ameaça

| Ameaça | Vetor | Mitigação |
|--------|-------|-----------|
| Execução não autorizada de SQL | Request sem JWT válido | AuthMiddleware valida token a cada request |
| Escalação de privilégio via role | Payload manipulado no client | Roles validadas server-side no AppServer; nunca no cliente |
| Execução de DDL destrutivo | Chamada à API sem confirmação | Detecção server-side + verificação de role `PQIDE_ADMIN` |
| Exfiltração de dados em massa | Exportação irrestrita | Limite de linhas por execução + log de exportações |
| Replay attack | Reutilização de token expirado | Validação de `exp` e `iat` do JWT a cada request |
| Cross-Site Scripting (XSS) | Dados da query renderizados como HTML | Resultados tratados como dados; nunca innerHTML |
| Abuso de taxa de requests | Automação contra a API REST | RateLimitMiddleware por usuário |
| Acesso ao AppServer.ini | Servidor comprometido | Credenciais nativas Protheus; não são gerenciadas pela app |

---

## 2. Autenticação — SSO via Protheus

### 2.1 Fluxo de Autenticação

```
  Usuário              Protheus WebApp            AppServer (TLPP)
     │                       │                          │
     │ 1. Login no Protheus  │                          │
     │──────────────────────>│                          │
     │                       │ 2. Autentica usuário     │
     │                       │─────────────────────────>│
     │                       │ 3. Emite JWT (Protheus)  │
     │                       │<─────────────────────────│
     │ 4. WebApp carrega     │                          │
     │    ProtheusQuery IDE  │                          │
     │<──────────────────────│                          │
     │                       │                          │
     │ 5. IDE injeta JWT em  │                          │
     │    cada request HTTP  │                          │
     │──────────────────────────────────────────────────>│
     │                       │ 6. AuthMiddleware valida JWT     │
     │                       │ 7. Verifica role PQIDE_ADMIN     │
     │                       │ 8. Processa request      │
     │<──────────────────────────────────────────────────│
```

### 2.2 Validação do Token JWT no TLPP

```tlpp
// AuthMiddleware.tlpp
Method ValidateRequest(oRequest As Object) As Logical
  Local cToken   As Character
  Local oPayload As Object
  Local cUser    As Character
  Local lValid   As Logical

  cToken := oRequest:GetHeader("Authorization")
  cToken := SubStr(cToken, 8) // Remove "Bearer "

  If Empty(cToken)
    oRequest:SetStatus(401)
    oRequest:SetBody('{"error":{"code":"MISSING_TOKEN","message":"Token ausente"}}')
    Return .F.
  EndIf

  // Validação via função nativa do AppServer Protheus
  lValid := TLPP_ValidateJWT(cToken, @oPayload)

  If !lValid
    oRequest:SetStatus(401)
    oRequest:SetBody('{"error":{"code":"INVALID_TOKEN","message":"Token inválido ou expirado"}}')
    Return .F.
  EndIf

  cUser := oPayload:GetValue("sub")

  // Verifica acesso ao módulo PQIDE via grupos do SIGACFG
  If !HasPQIDEAccess(cUser)
    oRequest:SetStatus(403)
    oRequest:SetBody('{"error":{"code":"ACCESS_DENIED","message":"Usuário sem acesso ao ProtheusQuery IDE"}}')
    Return .F.
  EndIf

  oRequest:SetContextValue("currentUser",  cUser)
  oRequest:SetContextValue("userPayload",  oPayload)
  Return .T.
EndMethod
```

### 2.3 Controle de Sessão

| Parâmetro | Valor |
|-----------|-------|
| Duração do token | Herdada do Protheus (padrão 8h) |
| Renovação | Via refresh do Protheus WebApp; transparente ao usuário |
| Invalidação | Por logout no Protheus; sessão invalidada imediatamente |
| Token em localStorage | ❌ Nunca — lido apenas de `window.TOTVS` em memória |

---

## 3. Autorização — Controle de Permissões

### 3.1 Contexto: AppServer Possui Acesso Amplo ao Banco

Como as queries são executadas via funções nativas TLPP (`TCQuery`, `TCSqlExec`), elas usam a mesma conexão de banco já estabelecida pelo AppServer Protheus. O usuário de banco configurado no AppServer.ini (tipicamente com amplos privilégios para o Protheus funcionar) é quem efetivamente executa o SQL.

**Consequência direta:** A aplicação é a única barreira de controle. Por isso o controle de roles é obrigatório e implementado **exclusivamente no backend TLPP**, nunca no Angular.

### 3.2 Roles da Aplicação (Grupos no SIGACFG)

| Role | Permissões | Atribuição |
|------|-----------|-----------|
| `PQIDE_VIEWER` | Apenas SELECT | Grupo no SIGACFG |
| `PQIDE_OPERATOR` | SELECT + DML (INSERT/UPDATE/DELETE) | Grupo no SIGACFG |
| `PQIDE_ADMIN` | SELECT + DML + DDL completo | Grupo restrito no SIGACFG |

> **Nesta versão** o escopo é Administradores de Sistema com role `PQIDE_ADMIN`. A estrutura de roles múltiplas está preparada para evoluções futuras.

### 3.3 Verificação de Role por Tipo de Query

```tlpp
// QueryController.tlpp
Method ExecuteQuery(oRequest As Object) As Object
  Local cUser As Character := oRequest:GetContextValue("currentUser")
  Local cSql  As Character := oRequest:GetBodyParam("sql")
  Local cType As Character := DetectQueryType(cSql)

  // DDL exige PQIDE_ADMIN
  If cType == "DDL" .And. !UserHasRole(cUser, "PQIDE_ADMIN")
    Return BuildError(403, "PERMISSION_DENIED",;
      "Execução de DDL requer permissão PQIDE_ADMIN")
  EndIf

  // DML exige PQIDE_OPERATOR ou PQIDE_ADMIN
  If cType == "DML"
    If !UserHasRole(cUser, "PQIDE_OPERATOR") .And. ;
       !UserHasRole(cUser, "PQIDE_ADMIN")
      Return BuildError(403, "PERMISSION_DENIED",;
        "Execução de DML requer permissão PQIDE_OPERATOR ou superior")
    EndIf
  EndIf

  // Registra início no log de auditoria antes de executar
  AuditMiddleware():Log(cUser, "EXECUTE_" + cType, cSql, oRequest:GetIP())

  // Executa via AppServer nativo
  // ...
EndMethod
```

### 3.4 Detecção de Tipo de Query (Server-Side)

```tlpp
// Nunca confiar na classificação enviada pelo cliente
Function DetectQueryType(cSql As Character) As Character
  Local cUpper As Character := Upper(AllTrim(cSql))

  If cUpper Begins "CREATE"   .Or. cUpper Begins "ALTER"    .Or. ;
     cUpper Begins "DROP"     .Or. cUpper Begins "TRUNCATE"  .Or. ;
     cUpper Begins "RENAME"
    Return "DDL"
  EndIf

  If cUpper Begins "INSERT"   .Or. cUpper Begins "UPDATE"   .Or. ;
     cUpper Begins "DELETE"   .Or. cUpper Begins "MERGE"
    Return "DML"
  EndIf

  Return "SELECT"
EndFunction
```

---

## 4. Proteção da Execução de SQL

A aplicação executa SQL livre digitado pelo administrador — isso é intencional em uma IDE. A proteção não é bloquear SQL dinâmico, mas garantir que **somente usuários autorizados executem, de forma rastreada, no contexto correto**.

### 4.1 Camadas de Proteção

| Camada | Mecanismo | Onde |
|--------|-----------|------|
| Autenticação | JWT Protheus válido em todo request | AuthMiddleware (TLPP) |
| Autorização | Role verificada server-side por tipo de query | QueryController (TLPP) |
| Confirmação | DML/DDL exigem confirmação explícita | Frontend (Angular) + verificado no backend |
| Limite de resultados | TOP/LIMIT/FETCH FIRST aplicados no SQL | SqlDialectHelper (TLPP) |
| Timeout | Parâmetro em `TCSqlOpen()` | QueryService (TLPP) |
| Auditoria | Todo SQL executado registrado em PQAUDT | AuditMiddleware (TLPP) |
| Rate limiting | 60 requests/min por usuário | RateLimitMiddleware (TLPP) |

### 4.2 Validações Adicionais no Backend

```tlpp
Function ValidateSqlInput(cSql As Character) As Logical
  Local cUpper As Character := Upper(cSql)

  // Bloquear múltiplos statements encadeados (ex: DROP TABLE x; DROP TABLE y)
  // Apenas um statement por request é permitido
  Local nSemiPos As Integer := At(";", RTrim(cSql))
  If nSemiPos > 0 .And. nSemiPos < Len(RTrim(cSql))
    Return .F.  // Ponto e vírgula no meio — indica múltiplos statements
  EndIf

  // Bloquear execução dinâmica de SQL (evita bypass de controles)
  Local aDangerous As Array
  aDangerous := {"EXEC ", "EXECUTE ", "XP_", "SP_EXECUTESQL",;
                 "DBMS_SQL", "EXECUTE IMMEDIATE"}
  Local i As Integer
  For i := 1 To Len(aDangerous)
    If aDangerous[i] InStr cUpper
      Return .F.
    EndIf
  Next i

  // Bloquear acesso a tabelas de sistema de banco
  Local aSysPrefixes As Array
  aSysPrefixes := {"SYS.", "INFORMATION_SCHEMA.", "PG_CATALOG.",;
                   "PG_TOAST", "DBA_", "ALL_TABLES", "V$"}
  For i := 1 To Len(aSysPrefixes)
    If aSysPrefixes[i] InStr cUpper
      Return .F.
    EndIf
  Next i

  Return .T.
EndFunction
```

### 4.3 Observação sobre Tabelas do Protheus

O administrador pode acessar qualquer tabela Protheus (`SA1010`, `SC5010`, etc.), pois isso é o propósito da ferramenta. As restrições de `ValidateSqlInput` bloqueiam apenas tabelas de **sistema do banco** (metadados, catálogos), não as tabelas de negócio do Protheus.

---

## 5. Segurança das Conexões de Banco

### 5.1 Credenciais Gerenciadas pelo AppServer

A principal vantagem de usar `TCQuery`/`TCSqlExec` é que **a aplicação ProtheusQuery IDE nunca armazena, lê ou transmite credenciais de banco de dados**. As strings de conexão estão no `AppServer.ini` do Protheus, fora do escopo da aplicação.

```
Responsabilidade das credenciais:
  ┌────────────────────────────────────────────┐
  │ ProtheusQuery IDE                          │
  │ (não tem acesso a credenciais de banco)    │
  └────────────────────────────────────────────┘
                    │ usa
  ┌────────────────────────────────────────────┐
  │ AppServer TLPP                             │
  │ TCQuery / TCSqlExec / MsConnect            │
  │ (gerencia a conexão; app não sabe a senha) │
  └────────────────────────────────────────────┘
                    │ conecta via
  ┌────────────────────────────────────────────┐
  │ AppServer.ini                              │
  │ [DATABASE] User=protheus_user              │
  │ Password=ENC(...)  ← gerenciado pela Totvs │
  └────────────────────────────────────────────┘
```

### 5.2 Conexões Adicionais via MsConnect

Para Oracle e PostgreSQL, o alias é configurado no `AppServer.ini` pelo DBA/infra — a aplicação apenas referencia o alias por nome. A disponibilidade de um alias é testada antes de expô-lo no seletor do frontend:

```tlpp
// SchemaController.tlpp — endpoint GET /connections
Method ListConnections(oRequest As Object) As Object
  Local aConns As Array := {}

  // Conexão padrão (Protheus) — sempre disponível
  AAdd(aConns, BuildConn("default", "SQL Server (Protheus)", .T.))

  // Oracle — testa MsConnect; fecha imediatamente se OK
  Local lOracle As Logical := MsConnect("DB_ORACLE")
  If lOracle ; MsDisconnect("DB_ORACLE") ; EndIf
  AAdd(aConns, BuildConn("oracle", "Oracle", lOracle))

  // PostgreSQL — idem
  Local lPg As Logical := MsConnect("DB_POSTGRES")
  If lPg ; MsDisconnect("DB_POSTGRES") ; EndIf
  AAdd(aConns, BuildConn("postgres", "PostgreSQL", lPg))

  Return aConns
EndMethod
```

---

## 6. Auditoria e Rastreabilidade

### 6.1 O que é Registrado em PQAUDT

| Evento | Campos |
|--------|--------|
| Acesso à aplicação | Usuário, IP, timestamp |
| SELECT executado | Usuário, banco, SQL completo, linhas, tempo, status |
| DML executado | Usuário, banco, SQL completo, linhas afetadas, status |
| DDL executado | Usuário, banco, SQL completo, status — **SEMPRE logado** |
| Exportação | Usuário, executionId, formato, linhas exportadas |
| Acesso negado (role) | Usuário, ação tentada, motivo |
| Erro de execução | Usuário, SQL, erro nativo via `TCSqlError()` |

### 6.2 Imutabilidade dos Logs

```tlpp
// AuditMiddleware.tlpp
// PQAUDT recebe apenas INSERT — sem endpoint de DELETE/UPDATE na API
Method WriteAudit(oData As Object) As Logical
  Local cSql As Character
  cSql := "INSERT INTO PQAUDT " +;
          "(AUD_ID, AUD_HISTID, AUD_EMPRESA, AUD_USUARIO, AUD_IP, " +;
          " AUD_DTLOG, AUD_ACAO, AUD_DETALHE) " +;
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  // Executa na conexão padrão do AppServer
  Return TCSqlExec(cSql, oData:ToArray())
EndMethod
// Não existe endpoint de remoção de PQAUDT na API REST
// Purga apenas via acesso direto de DBA, com aprovação formal
```

### 6.3 Retenção

| Tabela | Retenção | Responsável pela purga |
|--------|----------|----------------------|
| `PQAUDT` | Mínimo 365 dias | DBA (processo manual aprovado) |
| `PQHIST` | 90 dias (soft-delete por usuário) | Job TLPP automático |
| `PQFAVS` | Indefinido | Usuário |

---

## 7. Segurança no Frontend Angular

### 7.1 Proteção XSS

```typescript
// result-grid.component.ts
// Resultados nunca são renderizados como HTML — sempre como texto puro
// po-table do POUI não interpreta HTML em células por padrão
sanitizeCellValue(value: any): string {
  if (value === null || value === undefined) return '—';
  // Converte para string sem permitir interpretação HTML
  return String(value);
}
```

### 7.2 HTTP Interceptor — Injeção de Token

```typescript
@Injectable()
export class ProtheusAuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();

    if (!token) {
      this.authService.redirectToLogin();
      return EMPTY;
    }

    const authReq = req.clone({
      headers: req.headers
        .set('Authorization',       `Bearer ${token}`)
        .set('X-Protheus-Company',  this.authService.getCompany())
        .set('X-Protheus-Branch',   this.authService.getBranch())
    });

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) this.authService.redirectToLogin();
        return throwError(() => error);
      })
    );
  }
}
```

### 7.3 Content Security Policy

```
Content-Security-Policy:
  default-src 'self';
  script-src  'self' 'unsafe-eval';    /* Monaco Editor requer unsafe-eval */
  style-src   'self' 'unsafe-inline';  /* POUI requer inline styles */
  font-src    'self' data:;
  connect-src 'self';
  img-src     'self' data:;
  frame-ancestors 'self';              /* Apenas embed no próprio Protheus */
```

---

## 8. Checklist de Segurança para Deploy

```
PRÉ-DEPLOY:
[ ] HTTPS configurado no AppServer (sem HTTP em produção)
[ ] Certificado TLS válido (não autoassinado em produção)
[ ] Alias DB_ORACLE e DB_POSTGRES configurados no AppServer.ini (se usados)
[ ] Tabelas PQHIST, PQFAVS, PQAUDT criadas no banco Protheus
[ ] Grupo PQIDE_ADMIN configurado no SIGACFG com os usuários corretos
[ ] Confirmado que apenas Administradores de Sistema têm acesso ao grupo

PÓS-DEPLOY:
[ ] SELECT executa corretamente para usuário PQIDE_ADMIN
[ ] DML bloqueado corretamente para usuário sem role PQIDE_OPERATOR
[ ] DDL bloqueado corretamente para usuário sem role PQIDE_ADMIN
[ ] Log de auditoria (PQAUDT) gravado em toda execução
[ ] Token expirado retorna 401 (não 500)
[ ] Resultados não renderizam HTML (anti-XSS)
[ ] Múltiplos statements bloqueados (ex: "SELECT 1; DROP TABLE X")
[ ] MsConnect para Oracle/Postgres disponível ou indisponível conforme esperado
[ ] Exportação Excel/CSV funciona com acentos e caracteres especiais
[ ] Rate limit retorna 429 ao exceder 60 req/min por usuário
```

---

*Versão: 1.1 — Modelo de segurança ajustado para execução via AppServer nativo. Sem pqide_user separado; controle exclusivamente via roles e auditoria.*
