import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ApiService, ApiError } from './api.service';
import { environment } from '../../../environments/environment';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;

  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService]
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Inicialização', () => {
    it('deve ser criado', () => {
      expect(service).toBeTruthy();
    });

    it('deve usar a URL base do environment', () => {
      expect((service as any).baseUrl).toBe(environment.apiUrl);
    });
  });

  describe('post<T>', () => {
    it('deve realizar POST e retornar dados tipados', () => {
      const mockResponse = { id: '1', name: 'Test' };
      const endpoint = '/test';
      const body = { data: 'payload' };

      service.post<typeof mockResponse>(endpoint, body).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });

    it('deve tratar erro com mensagem no objeto', () => {
      const endpoint = '/test';
      const body = { data: 'payload' };
      const errorResponse: ApiError = { code: 'ERR001', message: 'Erro de teste' };

      service.post(endpoint, body).subscribe({
        error: error => {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBe('Erro de teste');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      req.flush(errorResponse, { status: 400, statusText: 'Bad Request' });
    });

    it('deve tratar erro string genérico', () => {
      const endpoint = '/test';
      const body = { data: 'payload' };

      service.post(endpoint, body).subscribe({
        error: error => {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBe('Erro simples');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      req.flush('Erro simples', { status: 500, statusText: 'Internal Server Error' });
    });

    it('deve tratar erro inesperado sem mensagem', () => {
      const endpoint = '/test';
      const body = { data: 'payload' };

      service.post(endpoint, body).subscribe({
        error: error => {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBe('Erro inesperado. Tente novamente.');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      req.flush(null, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('get<T>', () => {
    it('deve realizar GET sem parâmetros', () => {
      const mockResponse = [{ id: '1' }, { id: '2' }];
      const endpoint = '/list';

      service.get<typeof mockResponse>(endpoint).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}?`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('deve realizar GET com parâmetros', () => {
      const mockResponse = { data: 'result' };
      const endpoint = '/search';
      const params = { page: 1, pageSize: 10, active: true };

      service.get<typeof mockResponse>(endpoint, params).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(request =>
        request.url === `${baseUrl}${endpoint}` &&
        request.params.get('page') === '1' &&
        request.params.get('pageSize') === '10' &&
        request.params.get('active') === 'true'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('deve tratar erro com objeto contendo message', () => {
      const endpoint = '/test';
      const errorResponse: ApiError = { message: 'Recurso não encontrado' };

      service.get(endpoint).subscribe({
        error: error => {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBe('Recurso não encontrado');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}?`);
      req.flush(errorResponse, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('put<T>', () => {
    it('deve realizar PUT e retornar dados tipados', () => {
      const mockResponse = { id: '1', name: 'Updated' };
      const endpoint = '/test/1';
      const body = { name: 'Updated' };

      service.put<typeof mockResponse>(endpoint, body).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });

    it('deve tratar erro ao realizar PUT', () => {
      const endpoint = '/test/1';
      const body = { name: 'Updated' };

      service.put(endpoint, body).subscribe({
        error: error => {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBe('Erro ao atualizar');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      req.flush({ message: 'Erro ao atualizar' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('patch<T>', () => {
    it('deve realizar PATCH e retornar dados tipados', () => {
      const mockResponse = { id: '1', name: 'Patched' };
      const endpoint = '/test/1';
      const body = { name: 'Patched' };

      service.patch<typeof mockResponse>(endpoint, body).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });

    it('deve tratar erro ao realizar PATCH', () => {
      const endpoint = '/test/1';
      const body = { name: 'Patched' };

      service.patch(endpoint, body).subscribe({
        error: error => {
          expect(error).toBeInstanceOf(Error);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      req.flush(null, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('delete<T>', () => {
    it('deve realizar DELETE e retornar dados tipados', () => {
      const mockResponse = { deleted: true };
      const endpoint = '/test/1';

      service.delete<typeof mockResponse>(endpoint).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });

    it('deve realizar DELETE sem corpo de resposta', () => {
      const endpoint = '/test/1';

      service.delete<void>(endpoint).subscribe(response => {
        expect(response).toBeNull();
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('deve tratar erro ao realizar DELETE', () => {
      const endpoint = '/test/1';

      service.delete(endpoint).subscribe({
        error: error => {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBe('Não é possível deletar');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}${endpoint}`);
      req.flush({ message: 'Não é possível deletar' }, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('handleError (privado)', () => {
    it('deve extrair mensagem de ApiError object', () => {
      const apiError: ApiError = {
        code: 'DB_ERR',
        message: 'Erro de banco de dados',
        dbError: 'Connection timeout'
      };

      const handleError = (service as any).handleError;
      const result = handleError.call(service, apiError);

      result.subscribe({
        error: (error: Error) => {
          expect(error.message).toBe('Erro de banco de dados');
        }
      });
    });

    it('deve tratar erro string', () => {
      const handleError = (service as any).handleError;
      const result = handleError.call(service, 'Erro simples');

      result.subscribe({
        error: (error: Error) => {
          expect(error.message).toBe('Erro simples');
        }
      });
    });

    it('deve tratar erro null/undefined', () => {
      const handleError = (service as any).handleError;
      const result = handleError.call(service, null);

      result.subscribe({
        error: (error: Error) => {
          expect(error.message).toBe('Erro inesperado. Tente novamente.');
        }
      });
    });

    it('deve tratar erro sem propriedade message', () => {
      const handleError = (service as any).handleError;
      const result = handleError.call(service, { code: 'UNKNOWN' });

      result.subscribe({
        error: (error: Error) => {
          expect(error.message).toBe('Erro inesperado. Tente novamente.');
        }
      });
    });
  });
});
