import { CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AlertService } from './services/alert.service';
export const photoSelectionGuard: CanMatchFn = (route, segments) => {
  const token = localStorage.getItem('uniqueCode');
  const router = inject(Router);
  const alert = inject(AlertService);

  if (token) {
    return true;
  } else {
    alert.error('Please Enter Unique code');
    router.navigate(['/login']);
    return false;
  }
};
