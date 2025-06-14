import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseService } from './base.service';

export interface FileRecord {
  id: number;
  customer_id: number;
  filename: string;
  path: string;
  uploaded_at: string;
}

interface DashboardStats {
  totalCustomers: number;
  totalFiles: number;
  recentActivity: Array<{
    name: string;
    filename: string;
    uploaded_at: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class FileService extends BaseService {
  constructor(
     http: HttpClient
  ) { 
    super(http)
  }

  uploadFiles(customerId: number, files: File[]) {
    // const formData = new FormData();
    // for (const file of files) {
    //   formData.append('files', file);
    // }

    // return this.http.post<FileRecord[]>(`${environment.apiUrl}/customers/${customerId}/files`, formData, {
    //   headers: {
    //     Authorization: `Bearer ${this.authService.getToken()}`
    //   }
    // });
  }

  getDashboardStats(callback:any) {
    return this.getData({}, this.httpUrls['dashboard'],callback);
    // return this.http.get<DashboardStats>(`${environment.apiUrl}/dashboard`, {
    //   headers: {
    //     Authorization: `Bearer ${this.authService.getToken()}`
    //   }
    // });
  }
}
