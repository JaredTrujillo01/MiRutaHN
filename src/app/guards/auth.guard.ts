import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Private routes require an active session.
  if (await authService.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
