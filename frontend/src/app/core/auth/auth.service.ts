import { Injectable } from '@angular/core';

declare global {
  interface Window {
    TOTVS?: {
      session?: {
        token?: string;
        user?: any;
        company?: string;
        branch?: string;
      };
    };
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  getToken(): string {
    return (window as any).TOTVS?.session?.token ?? '';
  }

  getUser(): any {
    return (window as any).TOTVS?.session?.user ?? null;
  }

  getCompany(): string {
    return (window as any).TOTVS?.session?.company ?? '';
  }

  getBranch(): string {
    return (window as any).TOTVS?.session?.branch ?? '';
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && token.length > 0;
  }

  redirectToLogin(): void {
    window.location.href = '/login';
  }
}
