// src/app/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const excludeUrls = ['/api/mystudio/auth/getOTPForPinUser'];
  const isExcluded = excludeUrls.some(url => req.url.includes(url));

  if (isExcluded) {
    return next(req);
  }

  const token = localStorage.getItem('token');
  const adminToken = localStorage.getItem('adminToken');
  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(cloned);
  }

  if (adminToken) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    return next(cloned);
  }

  return next(req);
};
