import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HistoryService } from './history.service';
import { ApiService } from '../../core/http/api.service';
import { HistoryRecord, PagedResult } from '../../core/models/history.model';
import { environment } from '../../../environments/environment';

describe('HistoryService', () => {
  let service: HistoryService;
  let apiService: ApiService;
  let httpMock: HttpTestingController;

  const mockHistoryRecord: HistoryRecord = {
    id: 'hist-001',
    empresa: 'T1',
    filial: 'SP01',
    usuario: 'admin',
    dtExec: new Date('2024-01-15T10:30:00'),
    banco: 'PROTHEUS',
    sql: 'SELECT * FROM SA1 WHERE A1_COD = ?',
    tipo: 'SELECT',
    rows: 10,
    tempo: 250,
    status: 'S'
  };

  const mockHistoryRecordWithError: HistoryRecord = {
    id: 'hist-002',
    empresa: 'T1',
    filial: 'SP01',
    usuario: 'admin',
    dtExec: new Date('2024-01-15T11:00:00'),
    banco: 'PROTHEUS',
    sql: 'SELECT * FROM INVALID_TABLE',
    tipo: 'SELECT',
    rows: 0,
    tempo: 50,
    status: 'E',
    erro: 'Tabela não encontrada'
  };

  const mockPagedResult: PagedResult<HistoryRecord> = {
    items: [mockHistoryRecord, mockHistoryRecordWithError],
    total: 2,
    page: 1,
    pageSize: 10
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [HistoryService, ApiService]
    });

    service = TestBed.inject(HistoryService);
    apiService = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Inicialização', () => {
    it('deve ser criado', () => {
      expect(service).toBeTruthy();
    });

    it('deve ter endpoint configurado como /history', () => {
      expect((service as any).endpoint).toBe('/history');
    });
  });

  describe('getHistory', () => {
    it('deve retornar histórico paginado', () => {
      service.getHistory(1, 10).subscribe(result => {
        expect(result).toEqual(mockPagedResult);
        expect(result.items.length).toBe(2);
        expect(result.total).toBe(2);
        expect(result.page).toBe(1);
        expect(result.pageSize).toBe(10);
      });

      const req = httpMock.expectOne(request =>
        request.url === `${environment.apiUrl}/history` &&
        request.params.get('page') === '1' &&
        request.params.get('pageSize') === '10'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockPagedResult);
    });

    it('deve aceitar diferentes valores de página e tamanho', () => {
      const page = 3;
      const pageSize = 25;

      service.getHistory(page, pageSize).subscribe(result => {
        expect(result.page).toBe(3);
        expect(result.pageSize).toBe(25);
      });

      const req = httpMock.expectOne(request =>
        request.url === `${environment.apiUrl}/history` &&
        request.params.get('page') === '3' &&
        request.params.get('pageSize') === '25'
      );
      req.flush({ ...mockPagedResult, page: 3, pageSize: 25 });
    });

    it('deve retornar lista vazia quando não há registros', () => {
      const emptyResult: PagedResult<HistoryRecord> = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10
      };

      service.getHistory(1, 10).subscribe(result => {
        expect(result.items).toEqual([]);
        expect(result.total).toBe(0);
      });

      const req = httpMock.expectOne(request =>
        request.url === `${environment.apiUrl}/history` &&
        request.params.get('page') === '1' &&
        request.params.get('pageSize') === '10'
      );
      req.flush(emptyResult);
    });

    it('deve tratar erro de rede', () => {
      service.getHistory(1, 10).subscribe({
        error: error => {
          expect(error).toBeDefined();
        }
      });

      const req = httpMock.expectOne(request =>
        request.url === `${environment.apiUrl}/history` &&
        request.params.get('page') === '1' &&
        request.params.get('pageSize') === '10'
      );
      req.flush({ message: 'Erro de conexão' }, { status: 500, statusText: 'Internal Server Error' });
    });

    it('deve retornar registros com status de sucesso', () => {
      const successResult: PagedResult<HistoryRecord> = {
        items: [mockHistoryRecord],
        total: 1,
        page: 1,
        pageSize: 10
      };

      service.getHistory(1, 10).subscribe(result => {
        expect(result.items[0].status).toBe('S');
        expect(result.items[0].erro).toBeUndefined();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/history?page=1&pageSize=10`);
      req.flush(successResult);
    });

    it('deve retornar registros com status de erro', () => {
      const errorResult: PagedResult<HistoryRecord> = {
        items: [mockHistoryRecordWithError],
        total: 1,
        page: 1,
        pageSize: 10
      };

      service.getHistory(1, 10).subscribe(result => {
        expect(result.items[0].status).toBe('E');
        expect(result.items[0].erro).toBe('Tabela não encontrada');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/history?page=1&pageSize=10`);
      req.flush(errorResult);
    });
  });

  describe('getHistoryById', () => {
    it('deve retornar registro de histórico específico', () => {
      const id = 'hist-001';

      service.getHistoryById(id).subscribe(result => {
        expect(result).toEqual(mockHistoryRecord);
        expect(result.id).toBe(id);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/history/${id}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockHistoryRecord);
    });

    it('deve tratar erro quando registro não encontrado', () => {
      const id = 'nonexistent';

      service.getHistoryById(id).subscribe({
        error: error => {
          expect(error).toBeDefined();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/history/${id}`);
      req.flush({ message: 'Registro não encontrado' }, { status: 404, statusText: 'Not Found' });
    });

    it('deve retornar registro com todos os campos', () => {
      const id = 'hist-001';

      service.getHistoryById(id).subscribe(result => {
        expect(result.id).toBe('hist-001');
        expect(result.empresa).toBe('T1');
        expect(result.filial).toBe('SP01');
        expect(result.usuario).toBe('admin');
        expect(result.banco).toBe('PROTHEUS');
        expect(result.sql).toBe('SELECT * FROM SA1 WHERE A1_COD = ?');
        expect(result.tipo).toBe('SELECT');
        expect(result.rows).toBe(10);
        expect(result.tempo).toBe(250);
        expect(result.status).toBe('S');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/history/${id}`);
      req.flush(mockHistoryRecord);
    });

    it('deve retornar registro do tipo DML', () => {
      const dmlRecord: HistoryRecord = {
        ...mockHistoryRecord,
        id: 'hist-dml',
        sql: 'UPDATE SA1 SET A1_NOME = ? WHERE A1_COD = ?',
        tipo: 'DML',
        rows: 1,
        rowsAffected: 1
      };

      service.getHistoryById('hist-dml').subscribe(result => {
        expect(result.tipo).toBe('DML');
        expect(result.sql).toContain('UPDATE');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/history/hist-dml`);
      req.flush(dmlRecord);
    });

    it('deve retornar registro do tipo DDL', () => {
      const ddlRecord: HistoryRecord = {
        ...mockHistoryRecord,
        id: 'hist-ddl',
        sql: 'CREATE TABLE TEST (ID NUMBER)',
        tipo: 'DDL',
        rows: 0
      };

      service.getHistoryById('hist-ddl').subscribe(result => {
        expect(result.tipo).toBe('DDL');
        expect(result.sql).toContain('CREATE');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/history/hist-ddl`);
      req.flush(ddlRecord);
    });
  });

  describe('deleteHistory', () => {
    it('deve deletar registro de histórico', () => {
      const id = 'hist-001';

      service.deleteHistory(id).subscribe(result => {
        expect(result).toBeNull();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/history/${id}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('deve tratar erro ao deletar registro', () => {
      const id = 'hist-001';

      service.deleteHistory(id).subscribe({
        error: error => {
          expect(error).toBeDefined();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/history/${id}`);
      req.flush({ message: 'Não é possível deletar' }, { status: 403, statusText: 'Forbidden' });
    });

    it('deve deletar registro com id específico', () => {
      const id = 'hist-specific-id';

      service.deleteHistory(id).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/history/${id}`);
      expect(req.request.url).toContain(id);
      req.flush(null);
    });

    it('deve tratar erro de servidor ao deletar', () => {
      const id = 'hist-001';

      service.deleteHistory(id).subscribe({
        error: error => {
          expect(error).toBeDefined();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/history/${id}`);
      req.flush({ message: 'Erro interno do servidor' }, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('Cenários de paginação', () => {
    it('deve lidar com primeira página', () => {
      const firstPageResult: PagedResult<HistoryRecord> = {
        items: [mockHistoryRecord],
        total: 50,
        page: 1,
        pageSize: 10
      };

      service.getHistory(1, 10).subscribe(result => {
        expect(result.page).toBe(1);
        expect(result.total).toBe(50);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/history?page=1&pageSize=10`);
      req.flush(firstPageResult);
    });

    it('deve lidar com última página', () => {
      const lastPageResult: PagedResult<HistoryRecord> = {
        items: [mockHistoryRecord],
        total: 50,
        page: 5,
        pageSize: 10
      };

      service.getHistory(5, 10).subscribe(result => {
        expect(result.page).toBe(5);
        expect(result.items.length).toBe(1);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/history?page=5&pageSize=10`);
      req.flush(lastPageResult);
    });

    it('deve lidar com página intermediária', () => {
      const middlePageResult: PagedResult<HistoryRecord> = {
        items: [mockHistoryRecord, mockHistoryRecordWithError],
        total: 50,
        page: 3,
        pageSize: 10
      };

      service.getHistory(3, 10).subscribe(result => {
        expect(result.page).toBe(3);
        expect(result.items.length).toBe(2);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/history?page=3&pageSize=10`);
      req.flush(middlePageResult);
    });
  });
});
