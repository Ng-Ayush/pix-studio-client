import { CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AlertService } from './services/alert.service';

export const authGuard: CanMatchFn = () => {
  const token = localStorage.getItem('token');
  const router = inject(Router);
  const alert = inject(AlertService);

  if (token) {
    return true;
  } else {
    alert.error('Please login first');
    router.navigate(['/login']);
    return false;
  }
};
