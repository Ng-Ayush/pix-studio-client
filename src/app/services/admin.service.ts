import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from './base.service';

@Injectable({
  providedIn: 'root'
})
export class AdminService extends BaseService {

  constructor(http: HttpClient) {
    super(http);
  }

  adminLogin(params: any, callback: any) {
    return this.postData(params, this.httpUrls['adminLogin'], callback);
  }

  }
