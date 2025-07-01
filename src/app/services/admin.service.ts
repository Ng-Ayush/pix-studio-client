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
  getAllUsers(callback: any) {
    return this.getData({}, this.httpUrls['getAllUsers'], callback)
  }

  createUsers(params: any, callback: any) {
    return this.postData(params, this.httpUrls['createUsers'], callback)
  }

  getUsersById(userId: string, callback: any) {
    return this.getData({}, this.httpUrls['getUsersById'] + "/" + userId, callback)
  }

  updateUsers(params: any, callback: any) {
    return this.putData(params, this.httpUrls['updateUsers'], callback)
  }

  deleteUsers(id: any, callback: any) {
    return this.deleteData({}, this.httpUrls['deleteUsers'] + "/" + id, callback)
  }

  getAllFeatures(callback: any) {
    return this.getData({}, this.httpUrls['getAllFeatures'], callback)
  }

  createFeatures(params: any, callback: any) {
    return this.postData(params, this.httpUrls['createFeatures'], callback)
  }

  getFeatureById(userId: string, callback: any) {
    return this.getData({}, this.httpUrls['getFeatureById'] + "/" + userId, callback)
  }
  
  updateFeature(params: any, callback: any) {
    return this.putData(params, this.httpUrls['updateFeature'], callback)
  }
  deleteFeatures(id: any, callback: any) {
    return this.deleteData({}, this.httpUrls['deleteFeatures'] + "/" + id, callback)
  }
}
