import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let originalWindow: Window & typeof globalThis;

  beforeEach(() => {
    originalWindow = window;

    TestBed.configureTestingModule({
      providers: [AuthService]
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    delete (window as any).TOTVS;
  });

  describe('Inicialização', () => {
    it('deve ser criado', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('getToken', () => {
    it('deve retornar token quando TOTVS.session.token existe', () => {
      (window as any).TOTVS = {
        session: {
          token: 'abc123xyz'
        }
      };

      const token = service.getToken();
      expect(token).toBe('abc123xyz');
    });

    it('deve retornar string vazia quando TOTVS não existe', () => {
      delete (window as any).TOTVS;

      const token = service.getToken();
      expect(token).toBe('');
    });

    it('deve retornar string vazia quando session não existe', () => {
      (window as any).TOTVS = {};

      const token = service.getToken();
      expect(token).toBe('');
    });

    it('deve retornar string vazia quando token é undefined', () => {
      (window as any).TOTVS = {
        session: {}
      };

      const token = service.getToken();
      expect(token).toBe('');
    });
  });

  describe('getUser', () => {
    it('deve retornar usuário quando TOTVS.session.user existe', () => {
      const mockUser = { id: '1', name: 'João Silva', email: 'joao@test.com' };
      (window as any).TOTVS = {
        session: {
          user: mockUser
        }
      };

      const user = service.getUser();
      expect(user).toEqual(mockUser);
    });

    it('deve retornar null quando TOTVS não existe', () => {
      delete (window as any).TOTVS;

      const user = service.getUser();
      expect(user).toBeNull();
    });

    it('deve retornar null quando session não existe', () => {
      (window as any).TOTVS = {};

      const user = service.getUser();
      expect(user).toBeNull();
    });

    it('deve retornar null quando user é undefined', () => {
      (window as any).TOTVS = {
        session: {}
      };

      const user = service.getUser();
      expect(user).toBeNull();
    });
  });

  describe('getCompany', () => {
    it('deve retornar company quando TOTVS.session.company existe', () => {
      (window as any).TOTVS = {
        session: {
          company: 'T1'
        }
      };

      const company = service.getCompany();
      expect(company).toBe('T1');
    });

    it('deve retornar string vazia quando TOTVS não existe', () => {
      delete (window as any).TOTVS;

      const company = service.getCompany();
      expect(company).toBe('');
    });

    it('deve retornar string vazia quando session não existe', () => {
      (window as any).TOTVS = {};

      const company = service.getCompany();
      expect(company).toBe('');
    });

    it('deve retornar string vazia quando company é undefined', () => {
      (window as any).TOTVS = {
        session: {}
      };

      const company = service.getCompany();
      expect(company).toBe('');
    });
  });

  describe('getBranch', () => {
    it('deve retornar branch quando TOTVS.session.branch existe', () => {
      (window as any).TOTVS = {
        session: {
          branch: 'SP01'
        }
      };

      const branch = service.getBranch();
      expect(branch).toBe('SP01');
    });

    it('deve retornar string vazia quando TOTVS não existe', () => {
      delete (window as any).TOTVS;

      const branch = service.getBranch();
      expect(branch).toBe('');
    });

    it('deve retornar string vazia quando session não existe', () => {
      (window as any).TOTVS = {};

      const branch = service.getBranch();
      expect(branch).toBe('');
    });

    it('deve retornar string vazia quando branch é undefined', () => {
      (window as any).TOTVS = {
        session: {}
      };

      const branch = service.getBranch();
      expect(branch).toBe('');
    });
  });

  describe('isAuthenticated', () => {
    it('deve retornar true quando token existe e não é vazio', () => {
      (window as any).TOTVS = {
        session: {
          token: 'valid-token-123'
        }
      };

      const isAuthenticated = service.isAuthenticated();
      expect(isAuthenticated).toBe(true);
    });

    it('deve retornar false quando token é string vazia', () => {
      (window as any).TOTVS = {
        session: {
          token: ''
        }
      };

      const isAuthenticated = service.isAuthenticated();
      expect(isAuthenticated).toBe(false);
    });

    it('deve retornar false quando token é undefined', () => {
      (window as any).TOTVS = {
        session: {}
      };

      const isAuthenticated = service.isAuthenticated();
      expect(isAuthenticated).toBe(false);
    });

    it('deve retornar false quando TOTVS não existe', () => {
      delete (window as any).TOTVS;

      const isAuthenticated = service.isAuthenticated();
      expect(isAuthenticated).toBe(false);
    });

    it('deve retornar false quando session não existe', () => {
      (window as any).TOTVS = {};

      const isAuthenticated = service.isAuthenticated();
      expect(isAuthenticated).toBe(false);
    });

    it('deve retornar true para token com espaços', () => {
      (window as any).TOTVS = {
        session: {
          token: '   token-com-espacos   '
        }
      };

      const isAuthenticated = service.isAuthenticated();
      expect(isAuthenticated).toBe(true);
    });
  });

  describe('redirectToLogin', () => {
    it('deve redirecionar para /login', () => {
      const originalHref = window.location.href;
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true
      });

      service.redirectToLogin();
      expect(window.location.href).toBe('/login');
    });
  });

  describe('Cenários de integração', () => {
    it('deve retornar todos os dados da sessão quando TOTVS está completo', () => {
      const mockSession = {
        token: 'full-session-token',
        user: { id: '1', name: 'Admin' },
        company: 'T2',
        branch: 'RJ01'
      };

      (window as any).TOTVS = {
        session: mockSession
      };

      expect(service.getToken()).toBe('full-session-token');
      expect(service.getUser()).toEqual({ id: '1', name: 'Admin' });
      expect(service.getCompany()).toBe('T2');
      expect(service.getBranch()).toBe('RJ01');
      expect(service.isAuthenticated()).toBe(true);
    });

    it('deve retornar valores padrão quando TOTVS está vazio', () => {
      (window as any).TOTVS = {
        session: {}
      };

      expect(service.getToken()).toBe('');
      expect(service.getUser()).toBeNull();
      expect(service.getCompany()).toBe('');
      expect(service.getBranch()).toBe('');
      expect(service.isAuthenticated()).toBe(false);
    });
  });
});
