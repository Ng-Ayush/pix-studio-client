import { CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AlertService } from './services/alert.service';
export const superAdminAuthGuard: CanMatchFn = (route, segments) => {
  const token = localStorage.getItem('adminToken');
  const router = inject(Router);
  const alert = inject(AlertService);

  if (token) {
    return true;
  } else {
    alert.error('Please login first');
    router.navigate(['/admin/login']);
    return false;
  }
};
