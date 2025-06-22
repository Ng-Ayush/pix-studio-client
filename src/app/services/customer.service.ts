import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { BaseService } from './base.service';

export interface Customer {
  id: number;
  customer_id: string;
  name: string;
  phone: string;
  email?: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService extends BaseService {

  customer_unique_id:any= new BehaviorSubject(0);
  constructor(
    http: HttpClient,
  ) {
    super(http)
  }


  getAllCustomers(callback: any) {
    return this.getData({}, this.httpUrls['getAllCustomers'], callback)
  }

  getCustomers(callback: any) {
    return this.getData({}, this.httpUrls['getAllCustomers'], callback)
  }

  createCustomer(params: any, callback: any) {
    return this.postData(params, this.httpUrls['createCustomer'], callback)
  }

  shareCustomerFiles(customerId: number, callback: any) {
    // return this.http.post<{ whatsappLink: string }>(`${environment.apiUrl}/customers/${customerId}/share`, {}, {
    //   headers: {
    //     Authorization: `Bearer ${this.authService.getToken()}`
    //   }
    // });
  }

  getCustomerFiles(customerId: string, callback: any) {
    return this.getData({}, this.httpUrls['fetchCustomerFilesById'] + "/" + customerId, callback)
  }

  updateCustomer(params: any, callback: any) {
    return this.putData(params, this.httpUrls['updateCustomer'], callback)
  }

  deleteCustomer(id: any, callback: any) {
    return this.deleteData({}, this.httpUrls['deleteCustomer'] + "/" + id, callback)
  }

  searchCustomer(params: any) {
    const headers: any = new HttpHeaders().set('Authorization', `Bearer ${this.token}`);
    return this.http.get(environment.apiUrl + this.httpUrls['searchCustomer'] + "/" + params, { headers: headers });
  }

  verifyUniqueCode(params:any, callback: any) {
    return this.postData(params, this.httpUrls['verifyUniqueCode'], callback)
  }

  getFolderListByCustomerCode(params:any, callback: any) {
    return this.postData(params, this.httpUrls['getFolderListByCustomerCode'], callback)
  }

}
