# Testing — ProtheusQuery IDE

## 1. Visão Geral dos Testes

O ProtheusQuery IDE adota uma estratégia de testes em pirâmide, cobrindo três camadas:

```
            ┌─────────┐
            │   E2E   │  ← Poucos, validam fluxos completos
            ├─────────┤
            │Integração│ ← Validam comunicação entre camadas
           └───────────┘
          ┌──────────────┐
          │   Unitários   │ ← Maioria dos testes, rápidos e isolados
          └──────────────┘
```

| Camada | Tecnologia | Localização |
|--------|-----------|-------------|
| Unitário Frontend | Jasmine + Karma | `frontend/src/**/*.spec.ts` |
| Unitário Backend TLPP | TLPP Test Framework | `backend/src/**/*.test.tlpp` |
| Integração | Jasmine (HttpClient) | `frontend/src/**/*.integration.spec.ts` |
| E2E | Protractor / Cypress | `e2e/` |

Convenções de nomenclatura:

- `*.spec.ts` — testes unitários e de integração do frontend
- `*.test.tlpp` — testes unitários do backend TLPP
- `*.e2e-spec.ts` — testes end-to-end

---

## 2. Testes Unitários Frontend

### 2.1 Framework e Configuração

O frontend utiliza **Jasmine** como framework de assertions e **Karma** como test runner, padrão do Angular CLI.

Arquivos de configuração relevantes:

- `frontend/tsconfig.spec.json` — inclui `src/**/*.spec.ts` e tipagens Jasmine
- `frontend/angular.json` — seção `architect.test` com builder `@angular-devkit/build-angular:karma`

### 2.2 Estrutura de Testes

```
frontend/src/app/
├── core/
│   ├── auth/
│   │   ├── auth.service.spec.ts
│   │   ├── protheus-auth.guard.spec.ts
│   │   └── protheus-auth.interceptor.spec.ts
│   ├── http/
│   │   └── api.service.spec.ts
│   └── models/
│       ├── connection.model.spec.ts
│       ├── favorite.model.spec.ts
│       ├── history.model.spec.ts
│       └── query.model.spec.ts
├── features/
│   ├── query-editor/
│   │   ├── query-editor.component.spec.ts
│   │   ├── query-editor.service.spec.ts
│   │   ├── tabs.component.spec.ts
│   │   └── toolbar.component.spec.ts
│   ├── results/
│   │   ├── results.component.spec.ts
│   │   └── export.service.spec.ts
│   ├── history/
│   │   ├── history.component.spec.ts
│   │   └── history.service.spec.ts
│   └── favorites/
│       ├── favorites.component.spec.ts
│       └── favorite.service.spec.ts
└── shared/
    ├── components/
    │   ├── confirm-dialog/
    │   │   └── confirm-dialog.component.spec.ts
    │   ├── result-grid/
    │   │   └── result-grid.component.spec.ts
    │   └── status-bar/
    │       └── status-bar.component.spec.ts
    └── pipes/
        └── sql-highlight.pipe.spec.ts
```

### 2.3 Exemplo de Teste Unitário (Componente)

```typescript
// query-editor.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QueryEditorComponent } from './query-editor.component';
import { QueryEditorService } from './query-editor.service';
import { of } from 'rxjs';

describe('QueryEditorComponent', () => {
  let component: QueryEditorComponent;
  let fixture: ComponentFixture<QueryEditorComponent>;
  let queryServiceSpy: jasmine.SpyObj<QueryEditorService>;

  beforeEach(async () => {
    queryServiceSpy = jasmine.createSpyObj('QueryEditorService', ['executeQuery']);

    await TestBed.configureTestingModule({
      declarations: [QueryEditorComponent],
      providers: [
        { provide: QueryEditorService, useValue: queryServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(QueryEditorComponent);
    component = fixture.componentInstance;
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve executar query SELECT e emitir resultados', () => {
    const mockResult = { rows: [{ id: 1 }], columns: ['id'], rowCount: 1, elapsed: 42 };
    queryServiceSpy.executeQuery.and.returnValue(of(mockResult));

    component.sql = 'SELECT * FROM SA1';
    component.executeQuery();

    expect(queryServiceSpy.executeQuery).toHaveBeenCalledWith(
      jasmine.objectContaining({ sql: 'SELECT * FROM SA1' })
    );
  });

  it('deve bloquear DML sem confirmação do usuário', () => {
    component.sql = 'DELETE FROM SA1 WHERE D_E_L_E_T_ = \' \'';
    const allowed = component.canExecuteWithoutConfirmation();

    expect(allowed).toBeFalse();
  });
});
```

### 2.4 Exemplo de Teste Unitário (Serviço)

```typescript
// api.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService]
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve enviar query via POST /api/query/execute', () => {
    const request = { sql: 'SELECT 1', database: 'MSSQL' };

    service.executeQuery(request).subscribe(result => {
      expect(result.rowCount).toBe(1);
    });

    const req = httpMock.expectOne('/api/query/execute');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ rows: [{ col1: 1 }], columns: ['col1'], rowCount: 1, elapsed: 10 });
  });
});
```

### 2.5 Áreas de Cobertura Frontend

| Módulo | Alvo de Cobertura |
|--------|-------------------|
| `core/auth` | Auth guard, interceptor, service |
| `core/http` | ApiService (todos os métodos HTTP) |
| `core/models` | Serialização/deserialização de modelos |
| `features/query-editor` | Execução de queries, validação SQL, tabs |
| `features/results` | Renderização de grid, exportação |
| `features/history` | Listagem, filtros, reutilização |
| `features/favorites` | CRUD completo |
| `shared/components` | Diálogos, grid, status bar |
| `shared/pipes` | SQL syntax highlighting |

---

## 3. Testes Unitários Backend TLPP

### 3.1 Framework

O backend TLPP utiliza um framework de testes nativo compatível com o padrão Arrange-Act-assert. Os testes são executados dentro do AppServer Protheus.

### 3.2 Estrutura de Testes

```
backend/src/
├── controllers/
│   ├── QueryController.test.tlpp
│   ├── HistoryController.test.tlpp
│   ├── FavoriteController.test.tlpp
│   ├── ExportController.test.tlpp
│   └── SchemaController.test.tlpp
├── services/
│   ├── QueryService.test.tlpp
│   ├── HistoryService.test.tlpp
│   ├── FavoriteService.test.tlpp
│   ├── ExportService.test.tlpp
│   └── SchemaService.test.tlpp
├── helpers/
│   ├── ValidationHelper.test.tlpp
│   ├── ConnectionHelper.test.tlpp
│   ├── ResultSetHelper.test.tlpp
│   ├── SqlDialectHelper.test.tlpp
│   └── LoggerHelper.test.tlpp
├── middleware/
│   ├── AuthMiddleware.test.tlpp
│   ├── AuditMiddleware.test.tlpp
│   └── RateLimitMiddleware.test.tlpp
└── models/
    ├── QueryRequest.test.tlpp
    ├── QueryResult.test.tlpp
    ├── FavoriteRecord.test.tlpp
    └── HistoryRecord.test.tlpp
```

### 3.3 Categorias de Teste por Camada

#### Controllers

- Validação de parâmetros de entrada (query string, body, headers)
- Status codes de resposta corretos (200, 400, 401, 403, 404, 429, 500)
- Serialização JSON correta
- Tratamento de erros e exceções

#### Services

- Lógica de negócio isolada de dependências externas
- Interação correta com helpers e models
- Fluxos de sucesso e falha
- Tratamento de limites (paginação, tamanho máximo de resultado)

#### Helpers

- `ValidationHelper` — validação de SQL, detecção de comandos perigosos
- `ConnectionHelper` — conexão por alias, multi-banco
- `ResultSetHelper` — mapeamento de resultado TcQuery para modelo
- `SqlDialectHelper` — conversão de sintaxe entre bancos
- `LoggerHelper` — formatação e persistência de logs

#### Middleware

- `AuthMiddleware` — validação de JWT, extração de claims
- `AuditMiddleware` — registro correto em PQAUDT
- `RateLimitMiddleware` — bloqueio após limite, reset por janela

#### Models

- Construtores e validações de `QueryRequest`, `QueryResult`, `FavoriteRecord`, `HistoryRecord`

### 3.4 Exemplo de Teste TLPP

```tlpp
// ValidationHelper.test.tlpp
#include "protheus.ch"

User Function ValHlpTst()
    Local oTest := TTestSuite():New("ValidationHelper")

    // Teste: SELECT deve ser permitido
    oTest:AddTest("SELECT deve ser permitido", {|| ;
        U_PQValSql("SELECT * FROM SA1") == .T. ;
    })

    // Teste: DROP TABLE deve ser bloqueado
    oTest:AddTest("DROP TABLE deve ser bloqueado", {|| ;
        U_PQValSql("DROP TABLE SA1") == .F. ;
    })

    // Teste: TRUNCATE deve ser bloqueado
    oTest:AddTest("TRUNCATE deve ser bloqueado", {|| ;
        U_PQValSql("TRUNCATE TABLE SA1") == .F. ;
    })

    // Teste: INSERT deve retornar tipo DML
    oTest:AddTest("INSERT deve retornar tipo DML", {|| ;
        U_PQSqlType("INSERT INTO SA1 VALUES (...)") == "DML" ;
    })

    // Teste: CREATE deve retornar tipo DDL
    oTest:AddTest("CREATE deve retornar tipo DDL", {|| ;
        U_PQSqlType("CREATE TABLE TEST (ID INT)") == "DDL" ;
    })

    oTest:Run()
    oTest:Summary()
Return
```

---

## 4. Testes de Integração

### 4.1 Escopo

Os testes de integração validam a comunicação entre o frontend Angular e o backend TLPP, sem substituir o AppServer real.

### 4.2 Estratégia

Utilizam `HttpClientTestingModule` para interceptar chamadas HTTP e simular respostas do backend TLPP.

### 4.3 Áreas Cobertas

| Integração | Descrição |
|-----------|-----------|
| Query → API → Response | Execução de query com retorno de resultados paginados |
| History → API → List | Listagem de histórico com filtros de data e banco |
| Favorites → API → CRUD | Criação, leitura, atualização e exclusão de favoritos |
| Export → API → Download | Geração de XLSX/CSV e download |
| Auth → Interceptor → Header | Inclusão de JWT no header Authorization |
| Schema → API → Metadata | Consulta de metadados de tabelas e colunas |

### 4.4 Exemplo de Teste de Integração

```typescript
// history.integration.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HistoryService } from './history.service';

describe('HistoryService (Integração)', () => {
  let service: HistoryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [HistoryService]
    });
    service = TestBed.inject(HistoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('deve listar histórico com paginação', () => {
    service.getHistory({ page: 1, pageSize: 20 }).subscribe(result => {
      expect(result.data.length).toBe(20);
      expect(result.total).toBe(150);
    });

    const req = httpMock.expectOne(r => r.url === '/api/history' && r.method === 'GET');
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ data: new Array(20).fill({}), total: 150 });
  });

  it('deve filtrar histórico por tipo de query', () => {
    service.getHistory({ type: 'SELECT' }).subscribe(result => {
      result.data.forEach(item => expect(item.tipo).toBe('SELECT'));
    });

    const req = httpMock.expectOne(r => r.url === '/api/history');
    req.flush({ data: [{ tipo: 'SELECT' }], total: 1 });
  });
});
```

---

## 5. Testes E2E

### 5.1 Escopo

Testes end-to-end simulam o fluxo completo do usuário na aplicação, desde o login no Protheus até a execução de queries e exportação de resultados.

### 5.2 Cenários Críticos

| ID | Cenário | Prioridade |
|----|---------|------------|
| E2E-01 | Login no Protheus → acesso ao IDE | Crítica |
| E2E-02 | Executar query SELECT → visualizar resultados na grid | Crítica |
| E2E-03 | Executar query DML → confirmação → resultados | Alta |
| E2E-04 | Salvar query como favorito → recuperar → executar | Alta |
| E2E-05 | Exportar resultados para XLSX → download | Alta |
| E2E-06 | Exportar resultados para CSV → download | Alta |
| E2E-07 | Navegar no histórico → reutilizar query | Média |
| E2E-08 | Alternar entre múltiplas abas de query | Média |
| E2E-09 | Tratamento de erro — query inválida | Alta |
| E2E-10 | Tratamento de erro — timeout de execução | Alta |
| E2E-11 | Rate limiting — exceder 60 req/min | Média |
| E2E-12 | Acesso negado — usuário sem role adequada | Alta |

### 5.3 Estrutura E2E

```
e2e/
├── protractor.conf.js          # ou cypress.config.ts
├── src/
│   ├── login.e2e-spec.ts
│   ├── query-execution.e2e-spec.ts
│   ├── favorites.e2e-spec.ts
│   ├── history.e2e-spec.ts
│   ├── export.e2e-spec.ts
│   ├── error-handling.e2e-spec.ts
│   └── security.e2e-spec.ts
└── fixtures/
    ├── test-queries.json
    └── mock-users.json
```

### 5.4 Exemplo de Cenário E2E

```typescript
// query-execution.e2e-spec.ts
describe('Execução de Query E2E', () => {
  beforeEach(async () => {
    await browser.get('/ide');
    await element(by.css('[data-testid="editor-textarea"]')).clear();
  });

  it('E2E-02: deve executar SELECT e exibir resultados', async () => {
    await element(by.css('[data-testid="editor-textarea"]'))
      .sendKeys('SELECT TOP 10 * FROM SA1');

    await element(by.css('[data-testid="btn-execute"]')).click();

    const resultRows = element.all(by.css('[data-testid="result-row"]'));
    expect(await resultRows.count()).toBeGreaterThan(0);

    const statusBar = element(by.css('[data-testid="status-bar"]'));
    expect(await statusBar.getText()).toContain('linhas');
  });

  it('E2E-03: deve exigir confirmação para DML', async () => {
    await element(by.css('[data-testid="editor-textarea"]'))
      .sendKeys('UPDATE SA1 SET A1_NOME = \'TEST\' WHERE A1_COD = \'000001\'');

    await element(by.css('[data-testid="btn-execute"]')).click();

    const confirmDialog = element(by.css('[data-testid="confirm-dialog"]'));
    expect(await confirmDialog.isPresent()).toBeTrue();
  });
});
```

---

## 6. Como Executar os Testes

### 6.1 Testes Unitários Frontend

```bash
cd frontend

# Executar todos os testes (headless)
npm test

# Executar com interface gráfica (watch mode)
ng test --watch

# Executar com relatório de cobertura
ng test --code-coverage

# Executar teste específico
ng test --include="**/query-editor.service.spec.ts"
```

O relatório de cobertura é gerado em `frontend/coverage/`.

### 6.2 Testes Unitários Backend TLPP

Os testes TLPP são executados dentro do AppServer Protheus:

```
// Via Protheus SmartClient ou Console
U_RunPQTests()    // Executa todos os testes
U_ValHlpTst()     // Executa ValidationHelper.test.tlpp
U_QuerySrvTst()   // Executa QueryService.test.tlpp
```

Alternativamente, configure uma rotina de build que conecta ao AppServer e dispara a execução:

```bash
# Exemplo via linha de comando (SmartClient headless)
SmartClient.exe -c=AppServer -e=environment -u=admin -p=senha -r=U_RunPQTests
```

### 6.3 Testes de Integração

```bash
cd frontend

# Executar apenas testes de integração
ng test --include="**/*.integration.spec.ts"
```

### 6.4 Testes E2E

```bash
# Com Protractor (Angular CLI padrão)
cd frontend
ng e2e

# Com Cypress (se migrado)
npx cypress open     # Modo interativo
npx cypress run      # Modo headless
```

### 6.5 Execução Completa (CI/CD)

```bash
# Script completo para pipeline
cd frontend
npm ci
npm run lint
ng test --watch=false --code-coverage --browsers=ChromeHeadless
ng e2e --webdriver-update=false
```

---

## 7. Cobertura Mínima Esperada

### 7.1 Metas Globais

| Métrica | Mínimo | Ideal |
|---------|--------|-------|
| Linhas (Lines) | 70% | 85% |
| Ramos (Branches) | 60% | 80% |
| Funções (Functions) | 70% | 85% |
| Declarações (Statements) | 70% | 85% |

### 7.2 Metas por Camada

| Camada | Alvo Linhas | Alvo Branches |
|--------|-------------|---------------|
| `core/auth` | 90% | 85% |
| `core/http` | 85% | 80% |
| `core/models` | 90% | 75% |
| `features/query-editor` | 75% | 65% |
| `features/results` | 75% | 65% |
| `features/history` | 75% | 65% |
| `features/favorites` | 75% | 65% |
| `shared/components` | 80% | 70% |
| `shared/pipes` | 90% | 80% |

### 7.3 Metas Backend TLPP

| Camada | Alvo |
|--------|------|
| Controllers | 70% |
| Services | 80% |
| Helpers | 85% |
| Middleware | 90% |
| Models | 80% |

### 7.4 Regras de Qualidade

- Nenhum teste pode ficar em estado `pending` ou `xit`/`xdescribe` em branch de release.
- Testes flaky (intermitentes) devem ser corrigidos em até 48h.
- Novas features devem incluir testes unitários correspondentes antes do merge.
- Bugs corrigidos devem incluir teste regressivo que reproduza o cenário.
- A cobertura não pode cair abaixo do mínimo estabelecido em nenhum merge para `main`.
