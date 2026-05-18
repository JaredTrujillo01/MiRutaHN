import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth';
import { UserRole } from '../services/usuario.service';

export const roleGuard: CanActivateFn = async (
  route
): Promise<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const rolesPermitidos = (route.data?.['roles'] ?? []) as UserRole[];

  if (!(await authService.isLoggedIn())) {
    return router.createUrlTree(['/login']);
  }

  // Role authorization is centralized for future protected routes.
  if (rolesPermitidos.length === 0 || (await authService.hasRole(rolesPermitidos))) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
