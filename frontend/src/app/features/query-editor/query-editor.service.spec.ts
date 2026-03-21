import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { QueryEditorService, QueryType } from './query-editor.service';
import { ApiService } from '../../core/http/api.service';
import { QueryRequest, QueryResult } from '../../core/models/query.model';
import { of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

describe('QueryEditorService', () => {
  let service: QueryEditorService;
  let apiService: ApiService;
  let httpMock: HttpTestingController;

  const mockQueryRequest: QueryRequest = {
    sql: 'SELECT * FROM SA1',
    database: 'PROTHEUS',
    company: 'T1',
    branch: 'SP01',
    maxRows: 100,
    timeout: 30
  };

  const mockQueryResult: QueryResult = {
    executionId: 'exec-001',
    columns: [
      { name: 'A1_COD', type: 'C', size: 6, dec: 0 },
      { name: 'A1_NOME', type: 'C', size: 40, dec: 0 }
    ],
    rows: [['000001', 'CLIENTE TESTE']],
    rowCount: 1,
    executionTimeMs: 150,
    queryType: 'SELECT',
    success: true
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [QueryEditorService, ApiService]
    });

    service = TestBed.inject(QueryEditorService);
    apiService = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    service.clearResult();
    service.clearError();
  });

  describe('Inicialização', () => {
    it('deve ser criado', () => {
      expect(service).toBeTruthy();
    });

    it('deve inicializar com isExecuting como false', () => {
      expect(service.isExecuting).toBe(false);
    });

    it('deve inicializar com currentResult como null', () => {
      expect(service.currentResult).toBeNull();
    });

    it('deve inicializar com error como null', () => {
      expect(service.error).toBeNull();
    });
  });

  describe('Observables', () => {
    it('deve emitir valor de isExecuting$', (done) => {
      let emissionCount = 0;
      service.isExecuting$.subscribe(value => {
        emissionCount++;
        if (emissionCount === 1) {
          expect(value).toBe(false);
          done();
        }
      });
    });

    it('deve emitir valor de currentResult$', (done) => {
      let emissionCount = 0;
      service.currentResult$.subscribe(value => {
        emissionCount++;
        if (emissionCount === 1) {
          expect(value).toBeNull();
          done();
        }
      });
    });

    it('deve emitir valor de error$', (done) => {
      let emissionCount = 0;
      service.error$.subscribe(value => {
        emissionCount++;
        if (emissionCount === 1) {
          expect(value).toBeNull();
          done();
        }
      });
    });
  });

  describe('executeQuery', () => {
    it('deve executar query com sucesso e atualizar currentResult', () => {
      service.executeQuery(mockQueryRequest).subscribe(result => {
        expect(result).toEqual(mockQueryResult);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/query/execute`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockQueryRequest);
      req.flush(mockQueryResult);

      expect(service.currentResult).toEqual(mockQueryResult);
      expect(service.isExecuting).toBe(false);
      expect(service.error).toBeNull();
    });

    it('deve definir isExecuting como true durante execução', () => {
      service.executeQuery(mockQueryRequest).subscribe();

      expect(service.isExecuting).toBe(true);

      const req = httpMock.expectOne(`${environment.apiUrl}/query/execute`);
      req.flush(mockQueryResult);

      expect(service.isExecuting).toBe(false);
    });

    it('deve limpar resultado anterior antes de executar', () => {
      const firstResult: QueryResult = {
        ...mockQueryResult,
        executionId: 'exec-001'
      };
      const secondResult: QueryResult = {
        ...mockQueryResult,
        executionId: 'exec-002'
      };

      service.executeQuery(mockQueryRequest).subscribe();
      const req1 = httpMock.expectOne(`${environment.apiUrl}/query/execute`);
      req1.flush(firstResult);

      expect(service.currentResult?.executionId).toBe('exec-001');

      service.executeQuery(mockQueryRequest).subscribe();
      expect(service.currentResult).toBeNull();

      const req2 = httpMock.expectOne(`${environment.apiUrl}/query/execute`);
      req2.flush(secondResult);

      expect(service.currentResult?.executionId).toBe('exec-002');
    });

    it('deve limpar erro anterior antes de executar', () => {
      service.clearError();
      (service as any).errorSubject.next('Erro anterior');

      service.executeQuery(mockQueryRequest).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/query/execute`);
      req.flush(mockQueryResult);

      expect(service.error).toBeNull();
    });

    it('deve tratar erro e atualizar errorSubject', () => {
      const errorMessage = 'Erro de conexão';

      service.executeQuery(mockQueryRequest).subscribe({
        error: error => {
          expect(error).toBeDefined();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/query/execute`);
      req.flush({ message: errorMessage }, { status: 500, statusText: 'Internal Server Error' });

      expect(service.error).toBe(errorMessage);
      expect(service.isExecuting).toBe(false);
    });

    it('deve tratar erro genérico sem mensagem', () => {
      service.executeQuery(mockQueryRequest).subscribe({
        error: error => {
          expect(error).toBeDefined();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/query/execute`);
      req.flush(null, { status: 500, statusText: 'Internal Server Error' });

      expect(service.error).toBeTruthy();
      expect(service.isExecuting).toBe(false);
    });
  });

  describe('cancelExecution', () => {
    it('deve cancelar execução e definir isExecuting como false', () => {
      service.executeQuery(mockQueryRequest).subscribe({
        error: () => {}
      });

      expect(service.isExecuting).toBe(true);

      service.cancelExecution();
      expect(service.isExecuting).toBe(false);

      const req = httpMock.expectOne(`${environment.apiUrl}/query/execute`);
      req.flush(mockQueryResult);
    });
  });

  describe('clearResult', () => {
    it('deve limpar resultado atual', () => {
      service.executeQuery(mockQueryRequest).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/query/execute`);
      req.flush(mockQueryResult);

      expect(service.currentResult).not.toBeNull();

      service.clearResult();
      expect(service.currentResult).toBeNull();
    });
  });

  describe('clearError', () => {
    it('deve limpar erro atual', () => {
      (service as any).errorSubject.next('Algum erro');

      expect(service.error).toBe('Algum erro');

      service.clearError();
      expect(service.error).toBeNull();
    });
  });

  describe('detectQueryType', () => {
    describe('SELECT', () => {
      it('deve detectar SELECT', () => {
        expect(service.detectQueryType('SELECT * FROM SA1')).toBe('SELECT');
      });

      it('deve detectar select em minúsculas', () => {
        expect(service.detectQueryType('select * from sa1')).toBe('SELECT');
      });

      it('deve detectar WITH (CTE)', () => {
        expect(service.detectQueryType('WITH cte AS (SELECT 1)')).toBe('SELECT');
      });

      it('deve detectar SHOW', () => {
        expect(service.detectQueryType('SHOW TABLES')).toBe('SELECT');
      });

      it('deve detectar DESCRIBE', () => {
        expect(service.detectQueryType('DESCRIBE SA1')).toBe('SELECT');
      });

      it('deve detectar DESC', () => {
        expect(service.detectQueryType('DESC SA1')).toBe('SELECT');
      });

      it('deve ignorar espaços em branco antes do comando', () => {
        expect(service.detectQueryType('   SELECT * FROM SA1')).toBe('SELECT');
      });

      it('deve ignorar tab e newline antes do comando', () => {
        expect(service.detectQueryType('\t\nSELECT * FROM SA1')).toBe('SELECT');
      });
    });

    describe('DML', () => {
      it('deve detectar INSERT', () => {
        expect(service.detectQueryType('INSERT INTO SA1 VALUES(...)')).toBe('DML');
      });

      it('deve detectar UPDATE', () => {
        expect(service.detectQueryType('UPDATE SA1 SET A1_NOME = "TEST"')).toBe('DML');
      });

      it('deve detectar DELETE', () => {
        expect(service.detectQueryType('DELETE FROM SA1 WHERE A1_COD = "001"')).toBe('DML');
      });

      it('deve detectar MERGE', () => {
        expect(service.detectQueryType('MERGE INTO SA1 USING ...')).toBe('DML');
      });

      it('deve detectar dml em minúsculas', () => {
        expect(service.detectQueryType('insert into sa1 values(...)')).toBe('DML');
      });
    });

    describe('DDL', () => {
      it('deve detectar CREATE', () => {
        expect(service.detectQueryType('CREATE TABLE TEST (ID NUMBER)')).toBe('DDL');
      });

      it('deve detectar ALTER', () => {
        expect(service.detectQueryType('ALTER TABLE SA1 ADD COLUMN TEST VARCHAR(50)')).toBe('DDL');
      });

      it('deve detectar DROP', () => {
        expect(service.detectQueryType('DROP TABLE TEST')).toBe('DDL');
      });

      it('deve detectar TRUNCATE', () => {
        expect(service.detectQueryType('TRUNCATE TABLE TEST')).toBe('DDL');
      });

      it('deve detectar RENAME', () => {
        expect(service.detectQueryType('RENAME TABLE OLD TO NEW')).toBe('DDL');
      });

      it('deve detectar GRANT', () => {
        expect(service.detectQueryType('GRANT SELECT ON SA1 TO USER')).toBe('DDL');
      });

      it('deve detectar REVOKE', () => {
        expect(service.detectQueryType('REVOKE SELECT ON SA1 FROM USER')).toBe('DDL');
      });

      it('deve detectar ddl em minúsculas', () => {
        expect(service.detectQueryType('create table test (id number)')).toBe('DDL');
      });
    });

    describe('Tipo padrão', () => {
      it('deve retornar SELECT para comandos desconhecidos', () => {
        expect(service.detectQueryType('EXECUTE PROCEDURE TEST')).toBe('SELECT');
      });

      it('deve retornar SELECT para query vazia', () => {
        expect(service.detectQueryType('')).toBe('SELECT');
      });

      it('deve retornar SELECT para apenas espaços', () => {
        expect(service.detectQueryType('   ')).toBe('SELECT');
      });
    });
  });

  describe('Getters', () => {
    it('deve retornar valor atual de currentResult via getter', () => {
      expect(service.currentResult).toBeNull();

      service.executeQuery(mockQueryRequest).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/query/execute`);
      req.flush(mockQueryResult);

      expect(service.currentResult).toEqual(mockQueryResult);
    });

    it('deve retornar valor atual de error via getter', () => {
      expect(service.error).toBeNull();

      (service as any).errorSubject.next('Erro de teste');
      expect(service.error).toBe('Erro de teste');
    });

    it('deve retornar valor atual de isExecuting via getter', () => {
      expect(service.isExecuting).toBe(false);

      service.executeQuery(mockQueryRequest).subscribe();
      expect(service.isExecuting).toBe(true);

      const req = httpMock.expectOne(`${environment.apiUrl}/query/execute`);
      req.flush(mockQueryResult);

      expect(service.isExecuting).toBe(false);
    });
  });

  describe('setExecuting (privado)', () => {
    it('deve atualizar isExecutingSubject', () => {
      const setExecuting = (service as any).setExecuting;

      setExecuting.call(service, true);
      expect(service.isExecuting).toBe(true);

      setExecuting.call(service, false);
      expect(service.isExecuting).toBe(false);
    });
  });
});
