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

  onImgUpload(params: any, callback: any) {
    return this.postData(params, this.httpUrls['onImgUpload'], callback)
  }
  getAllRequests(callback: any) {
    return this.getData({}, this.httpUrls['getAllRequests'], callback)
  }

  markAsResolvedByStatus(id: any, callback: any) {
    return this.deleteData({}, this.httpUrls['resolved'] + "/" + id, callback)
  }

  fetchSalesAndPendingGraphData(params: any, callback: any) {
    return this.getData({}, `${this.httpUrls['fetchSalesAndPendingGraphData']}?range=${params.range}`, callback)
  }
  getRequestById(userId: string, callback: any) {
    return this.getData({}, this.httpUrls['getRequestById'] + "/" + userId, callback)
  }
  updateRequest(params: any, callback: any) {
    return this.putData(params, this.httpUrls['updateRequest'], callback)
  }
  getUsersByCurrentId(userId: string, callback: any) {
    return this.getData({}, this.httpUrls['getUsersByCurrentId'] + "/" + userId, callback)
  }
  updateProfile(params: any, callback: any) {
    return this.putData(params, this.httpUrls['updateProfile'], callback)
  }

  createOrder(params: any, callback: any) {
    return this.postData(params, this.httpUrls['createOrder'], callback)
  }

  verifyPayment(params: any, callback: any) {
    return this.postData(params, this.httpUrls['verifyPayment'], callback)
  }

  getCalendarEvents(callback: any) {
    return this.getData({}, this.httpUrls['getCalendarEvents'], callback)
  }
  createCategory(params: any, callback: any) {
    return this.postData(params, this.httpUrls['createCategory'], callback)
  }

  updateCategory(params: any, catId: any, callback: any) {
    return this.putData(params, this.httpUrls['updateCategory'] + "/" + catId, callback)
  }

  deleteCategory(catId: any, callback: any) {
    return this.deleteData({}, this.httpUrls['deleteCategory'] + "/" + catId, callback)

  }
  getAllCategories(callback: any) {
    return this.getData({}, this.httpUrls['getAllCategories'], callback)
  }

  toggleAdminStatus(params: any, id: any, callback: any) {
    return this.putData(params, this.httpUrls['toggleAdminStatus'] + "/" + id, callback)
  }

  getFeaturesByCategory(category: any, callback: any) {
    return this.getData({}, this.httpUrls['getFeaturesByCategory'] + "/" + category, callback)
  }

  getFeaturesByNewArrival(callback: any) {
    return this.getData({}, this.httpUrls['getFeaturesByNewArrival'], callback)
  }

  getAgents(callback: any) {
    return this.getData({}, this.httpUrls['getAgents'], callback)
  }

  createAgent(params: any, callback: any) {
    return this.postData(params, this.httpUrls['createAgent'], callback)
  }
  
  getDynamicImageUrl(callback: any) {
    return this.getData({}, this.httpUrls['getDynamicImageUrl'], callback)
  }

  insertImages(params: any, callback: any) {
    return this.postData(params, this.httpUrls['insertImages'], callback)
  }

  getAllPromocodes(callback:any){
    return this.getData({}, this.httpUrls['getAllPromocodes'], callback)
  } 

  createPromocode(params: any, callback: any) {
    return this.postData(params, this.httpUrls['createPromocode'], callback)
  }

  deletePromocode(promocodeId: any, callback: any) {
    return this.deleteData({}, this.httpUrls['deletePromocode'] + "/" + promocodeId, callback)
  }

  updatePromocode(params: any, promocodeId: any, callback: any) {
    return this.putData(params, this.httpUrls['updatePromocode'] + "/" + promocodeId, callback)
  }

  togglePromocodeStatus(params:any, callback: any) {
    return this.putData(params, this.httpUrls['togglePromocodeStatus'], callback)
  }

  verifyAndApplyPromoCode(params: any, callback: any) {
    return this.postData(params, this.httpUrls['verifyAndApplyPromoCode'], callback)
  }
}
