import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FavoriteService } from './favorite.service';
import { ApiService } from '../../core/http/api.service';
import { FavoriteRecord } from '../../core/models/favorite.model';
import { environment } from '../../../environments/environment';

describe('FavoriteService', () => {
  let service: FavoriteService;
  let apiService: ApiService;
  let httpMock: HttpTestingController;

  const mockFavorite: FavoriteRecord = {
    id: 'fav-001',
    empresa: 'T1',
    usuario: 'admin',
    nome: 'Clientes Ativos',
    desc: 'Consulta de clientes ativos',
    sql: 'SELECT * FROM SA1 WHERE A1_MSBLQL <> "1"',
    banco: 'PROTHEUS',
    dtCri: new Date('2024-01-10T08:00:00'),
    dtAlt: new Date('2024-01-15T14:30:00')
  };

  const mockFavoriteWithoutDesc: FavoriteRecord = {
    id: 'fav-002',
    empresa: 'T1',
    usuario: 'admin',
    nome: 'Produtos',
    sql: 'SELECT * FROM SB1',
    banco: 'PROTHEUS',
    dtCri: new Date('2024-01-12T10:00:00')
  };

  const mockFavorites: FavoriteRecord[] = [mockFavorite, mockFavoriteWithoutDesc];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FavoriteService, ApiService]
    });

    service = TestBed.inject(FavoriteService);
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

    it('deve ter endpoint configurado como /favorites', () => {
      expect((service as any).endpoint).toBe('/favorites');
    });
  });

  describe('getFavorites', () => {
    it('deve retornar lista de favoritos', () => {
      service.getFavorites().subscribe(result => {
        expect(result).toEqual(mockFavorites);
        expect(result.length).toBe(2);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/favorites`);
      expect(req.request.method).toBe('GET');
      req.flush(mockFavorites);
    });

    it('deve retornar lista vazia quando não há favoritos', () => {
      service.getFavorites().subscribe(result => {
        expect(result).toEqual([]);
        expect(result.length).toBe(0);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/favorites`);
      req.flush([]);
    });

    it('deve retornar favoritos com todos os campos', () => {
      service.getFavorites().subscribe(result => {
        const fav = result[0];
        expect(fav.id).toBe('fav-001');
        expect(fav.empresa).toBe('T1');
        expect(fav.usuario).toBe('admin');
        expect(fav.nome).toBe('Clientes Ativos');
        expect(fav.desc).toBe('Consulta de clientes ativos');
        expect(fav.sql).toContain('SELECT');
        expect(fav.banco).toBe('PROTHEUS');
        expect(fav.dtCri).toBeDefined();
        expect(fav.dtAlt).toBeDefined();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/favorites`);
      req.flush([mockFavorite]);
    });

    it('deve retornar favoritos sem campo desc opcional', () => {
      service.getFavorites().subscribe(result => {
        const fav = result[0];
        expect(fav.desc).toBeUndefined();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/favorites`);
      req.flush([mockFavoriteWithoutDesc]);
    });

    it('deve tratar erro ao buscar favoritos', () => {
      service.getFavorites().subscribe({
        error: error => {
          expect(error).toBeDefined();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/favorites`);
      req.flush({ message: 'Erro ao buscar favoritos' }, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('createFavorite', () => {
    it('deve criar novo favorito', () => {
      const newFavorite: Omit<FavoriteRecord, 'id'> = {
        empresa: 'T1',
        usuario: 'admin',
        nome: 'Novo Favorito',
        desc: 'Descrição do novo favorito',
        sql: 'SELECT * FROM SX5',
        banco: 'PROTHEUS',
        dtCri: new Date()
      };

      const createdFavorite: FavoriteRecord = {
        ...newFavorite,
        id: 'fav-new-001'
      };

      service.createFavorite(newFavorite).subscribe(result => {
        expect(result).toEqual(createdFavorite);
        expect(result.id).toBeTruthy();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/favorites`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newFavorite);
      req.flush(createdFavorite);
    });

    it('deve criar favorito sem descrição', () => {
      const newFavorite: Omit<FavoriteRecord, 'id'> = {
        empresa: 'T1',
        usuario: 'admin',
        nome: 'Simples Favorito',
        sql: 'SELECT COUNT(*) FROM SA1',
        banco: 'PROTHEUS',
        dtCri: new Date()
      };

      const createdFavorite: FavoriteRecord = {
        ...newFavorite,
        id: 'fav-new-002'
      };

      service.createFavorite(newFavorite).subscribe(result => {
        expect(result.id).toBe('fav-new-002');
        expect(result.desc).toBeUndefined();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/favorites`);
      req.flush(createdFavorite);
    });

    it('deve tratar erro de validação ao criar favorito', () => {
      const invalidFavorite: Omit<FavoriteRecord, 'id'> = {
        empresa: '',
        usuario: '',
        nome: '',
        sql: '',
        banco: '',
        dtCri: new Date()
      };

      service.createFavorite(invalidFavorite).subscribe({
        error: error => {
          expect(error).toBeDefined();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/favorites`);
      req.flush({ message: 'Dados inválidos' }, { status: 400, statusText: 'Bad Request' });
    });

    it('deve tratar erro de duplicidade ao criar favorito', () => {
      const duplicateFavorite: Omit<FavoriteRecord, 'id'> = {
        empresa: 'T1',
        usuario: 'admin',
        nome: 'Clientes Ativos',
        sql: 'SELECT * FROM SA1',
        banco: 'PROTHEUS',
        dtCri: new Date()
      };

      service.createFavorite(duplicateFavorite).subscribe({
        error: error => {
          expect(error).toBeDefined();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/favorites`);
      req.flush({ message: 'Favorito já existe' }, { status: 409, statusText: 'Conflict' });
    });
  });

  describe('updateFavorite', () => {
    it('deve atualizar favorito existente', () => {
      const id = 'fav-001';
      const updateData: Partial<FavoriteRecord> = {
        nome: 'Clientes Ativos Atualizado',
        desc: 'Descrição atualizada',
        dtAlt: new Date()
      };

      const updatedFavorite: FavoriteRecord = {
        ...mockFavorite,
        ...updateData
      };

      service.updateFavorite(id, updateData).subscribe(result => {
        expect(result).toEqual(updatedFavorite);
        expect(result.nome).toBe('Clientes Ativos Atualizado');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/favorites/${id}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateData);
      req.flush(updatedFavorite);
    });

    it('deve atualizar apenas o SQL do favorito', () => {
      const id = 'fav-001';
      const updateData: Partial<FavoriteRecord> = {
        sql: 'SELECT A1_COD, A1_NOME FROM SA1 WHERE A1_MSBLQL <> "1"'
      };

      const updatedFavorite: FavoriteRecord = {
        ...mockFavorite,
        ...updateData
      };

      service.updateFavorite(id, updateData).subscribe(result => {
        expect(result.sql).toBe('SELECT A1_COD, A1_NOME FROM SA1 WHERE A1_MSBLQL <> "1"');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/favorites/${id}`);
      req.flush(updatedFavorite);
    });

    it('deve tratar erro ao atualizar favorito inexistente', () => {
      const id = 'nonexistent';

      service.updateFavorite(id, { nome: 'Test' }).subscribe({
        error: error => {
          expect(error).toBeDefined();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/favorites/${id}`);
      req.flush({ message: 'Favorito não encontrado' }, { status: 404, statusText: 'Not Found' });
    });

    it('deve tratar erro de validação ao atualizar', () => {
      const id = 'fav-001';
      const invalidData: Partial<FavoriteRecord> = {
        nome: ''
      };

      service.updateFavorite(id, invalidData).subscribe({
        error: error => {
          expect(error).toBeDefined();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/favorites/${id}`);
      req.flush({ message: 'Nome é obrigatório' }, { status: 400, statusText: 'Bad Request' });
    });

    it('deve atualizar descrição para undefined', () => {
      const id = 'fav-001';
      const updateData: Partial<FavoriteRecord> = {
        desc: undefined
      };

      const updatedFavorite: FavoriteRecord = {
        ...mockFavorite,
        desc: undefined
      };

      service.updateFavorite(id, updateData).subscribe(result => {
        expect(result.desc).toBeUndefined();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/favorites/${id}`);
      req.flush(updatedFavorite);
    });
  });

  describe('deleteFavorite', () => {
    it('deve deletar favorito existente', () => {
      const id = 'fav-001';

      service.deleteFavorite(id).subscribe(result => {
        expect(result).toBeNull();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/favorites/${id}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('deve deletar favorito com id específico', () => {
      const id = 'fav-specific-id';

      service.deleteFavorite(id).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/favorites/${id}`);
      expect(req.request.url).toContain(id);
      req.flush(null);
    });

    it('deve tratar erro ao deletar favorito inexistente', () => {
      const id = 'nonexistent';

      service.deleteFavorite(id).subscribe({
        error: error => {
          expect(error).toBeDefined();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/favorites/${id}`);
      req.flush({ message: 'Favorito não encontrado' }, { status: 404, statusText: 'Not Found' });
    });

    it('deve tratar erro de permissão ao deletar', () => {
      const id = 'fav-001';

      service.deleteFavorite(id).subscribe({
        error: error => {
          expect(error).toBeDefined();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/favorites/${id}`);
      req.flush({ message: 'Sem permissão para deletar' }, { status: 403, statusText: 'Forbidden' });
    });

    it('deve tratar erro de servidor ao deletar', () => {
      const id = 'fav-001';

      service.deleteFavorite(id).subscribe({
        error: error => {
          expect(error).toBeDefined();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/favorites/${id}`);
      req.flush({ message: 'Erro interno do servidor' }, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('Cenários de integração', () => {
    it('deve criar e depois buscar favoritos', () => {
      const newFavorite: Omit<FavoriteRecord, 'id'> = {
        empresa: 'T1',
        usuario: 'admin',
        nome: 'Novo Favorito',
        sql: 'SELECT * FROM SX5',
        banco: 'PROTHEUS',
        dtCri: new Date()
      };

      const createdFavorite: FavoriteRecord = {
        ...newFavorite,
        id: 'fav-new-001'
      };

      service.createFavorite(newFavorite).subscribe(result => {
        expect(result.id).toBeTruthy();
      });

      const createReq = httpMock.expectOne(`${environment.apiUrl}/favorites`);
      createReq.flush(createdFavorite);

      service.getFavorites().subscribe(result => {
        expect(result.length).toBe(1);
        expect(result[0].id).toBe('fav-new-001');
      });

      const getReq = httpMock.expectOne(`${environment.apiUrl}/favorites`);
      getReq.flush([createdFavorite]);
    });

    it('deve atualizar e depois deletar favorito', () => {
      const id = 'fav-001';
      const updateData: Partial<FavoriteRecord> = {
        nome: 'Atualizado'
      };

      service.updateFavorite(id, updateData).subscribe();

      const updateReq = httpMock.expectOne(`${environment.apiUrl}/favorites/${id}`);
      updateReq.flush({ ...mockFavorite, ...updateData });

      service.deleteFavorite(id).subscribe();

      const deleteReq = httpMock.expectOne(`${environment.apiUrl}/favorites/${id}`);
      deleteReq.flush(null);
    });

    it('deve buscar favoritos com diferentes tipos de SQL', () => {
      const favoritesWithDifferentSQL: FavoriteRecord[] = [
        { ...mockFavorite, id: 'fav-select', sql: 'SELECT * FROM SA1', nome: 'SELECT' },
        { ...mockFavorite, id: 'fav-insert', sql: 'INSERT INTO SA1 VALUES(...)', nome: 'INSERT' },
        { ...mockFavorite, id: 'fav-update', sql: 'UPDATE SA1 SET A1_NOME = ?', nome: 'UPDATE' },
        { ...mockFavorite, id: 'fav-delete', sql: 'DELETE FROM SA1 WHERE A1_COD = ?', nome: 'DELETE' },
        { ...mockFavorite, id: 'fav-create', sql: 'CREATE TABLE TEST (ID NUMBER)', nome: 'CREATE' }
      ];

      service.getFavorites().subscribe(result => {
        expect(result.length).toBe(5);
        expect(result[0].sql).toContain('SELECT');
        expect(result[1].sql).toContain('INSERT');
        expect(result[2].sql).toContain('UPDATE');
        expect(result[3].sql).toContain('DELETE');
        expect(result[4].sql).toContain('CREATE');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/favorites`);
      req.flush(favoritesWithDifferentSQL);
    });
  });
});
