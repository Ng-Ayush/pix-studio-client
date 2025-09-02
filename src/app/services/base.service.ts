import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
@Injectable({
  providedIn: 'root'
})
export class BaseService {

  httpUrls: any = {
    //AUTH 
    'login': '/api/mystudio/auth/login',
    'register': '/api/mystudio/auth/register',
    'getOTPForPinUser': '/api/mystudio/auth/getOTPForPinUser',
    'sendOTP': '/api/mystudio/otp/sendOTP',
    'verifyOTPForPinUser': '/api/mystudio/otp/verifyOTPForPinUser',

    //Admin
    'dashboard': '/api/mystudio/dashboard',
    'getAllCustomers': '/api/mystudio/customers/getAllCustomers',
    'createCustomer': '/api/mystudio/customers/createCustomer',
    'updateCustomer': '/api/mystudio/customers/updateCustomer',
    'deleteCustomer': '/api/mystudio/customers/deleteCustomer',
    'fetchCustomerFilesById': '/api/mystudio/customers/fetchCustomerFilesById',
    'searchCustomer': '/api/mystudio/customers/searchCustomer',
    'fetchSalesAndPendingGraphData':'/api/mystudio/dashboard/fetchSalesAndPendingGraphData',
    'getUsersByCurrentId':'/api/mystudio/manage-profile/getUsersByCurrentId',
    'updateProfile':'/api/mystudio/manage-profile/updateProfile',

    //Event
    'createEvent': '/api/mystudio/photo-selection/createEvent',
    'updateEvent': '/api/mystudio/photo-selection/updateEvent',
    'deleteEvent': '/api/mystudio/photo-selection/deleteEvent',
    'getAllEvents': '/api/mystudio/photo-selection/getAllEvents',
    'getEventById': '/api/mystudio/photo-selection/getEventById',
    'getFolderByEventId': '/api/mystudio/photo-selection/getFolderByEventId',
    'createNewFolder': '/api/mystudio/photo-selection/createNewFolder',
    'updateFolder': '/api/mystudio/photo-selection/updateFolder',
    'deleteFolder': '/api/mystudio/photo-selection/deleteFolder',
    'getAiGuestByEventId': '/api/mystudio/photo-selection/getAiGuestByEventId',
    'addAiGuest': '/api/mystudio/photo-selection/addAiGuest',
    'getUploadedPhotosByFolderId': '/api/mystudio/photo-selection/getUploadedPhotosByFolderId',
    'uploadPhotos': '/api/mystudio/photo-selection/uploadPhotos',
    'deletePhotos': '/api/mystudio/photo-selection/deletePhotos',
    'getAllPhotosByEventId': '/api/mystudio/photo-selection/getAllPhotosByEventId',


    //Customer Photo Selection
    'verifyUniqueCode': '/api/mystudio/photo-selection/verifyUniqueCode',
    'getFolderListByCustomerCode': '/api/mystudio/photo-selection/getFolderListByCustomerCode',
    'updatePhotoStatus': '/api/mystudio/photo-selection/updatePhotoStatus',
    'submitEvent': '/api/mystudio/photo-selection/submitEvent',

    //Billing
    'createParty': '/api/mystudio/billing-customer/createParty',
    'getAllParty': '/api/mystudio/billing-customer/getAllParty',
    'getPartyById': '/api/mystudio/billing-customer/getPartyById',
    'updateParty': '/api/mystudio/billing-customer/updateParty',
    'deleteParty': '/api/mystudio/billing-customer/deleteParty',
    'getInvoiceByPartyId': '/api/mystudio/billing-customer/getInvoiceByPartyId',
    'getInvoiceById': '/api/mystudio/invoices/getInvoiceById',
    'getLastInvoiceNumber': '/api/mystudio/invoices/getLastInvoiceNumber',
    'sendPdfViaWhatsApp': '/api/mystudio/invoices/sendPdfViaWhatsApp',
    'deleteInvoice': '/api/mystudio/invoices/deleteInvoice',



    'addInvoiceItem': '/api/mystudio/invoice-items/addInvoiceItem',
    'getAllInvoiceItems': '/api/mystudio/invoice-items/getAllInvoiceItems',
    'getInvoiceItemById': '/api/mystudio/invoice-items/getInvoiceItemById',
    'updateInvoiceItem': '/api/mystudio/invoice-items/updateInvoiceItem',

    'generateInvoice': '/api/mystudio/invoices/generateInvoice',
    'updateInvoice': '/api/mystudio/invoices/updateInvoice',
    'getInvoiceDetailByInvoiceNumber': '/api/mystudio/invoices/getInvoiceDetailByInvoiceNumber',
    'saveAdvancePayment': '/api/mystudio/invoices/saveAdvancePayment',
    'getPastPayments': '/api/mystudio/invoices/getPastPayments',

    //estimate
    'createEstimate': '/api/mystudio/estimates/createEstimate',
    'updateEstimate': '/api/mystudio/estimates/updateEstimate',
    'getEstimateList': '/api/mystudio/estimates/getEstimateList',
    'convertToSales': '/api/mystudio/estimates/convertToSales',

    // super admin
    'adminLogin': '/api/mystudio/super-admin/login',
    'getAllUsers': '/api/mystudio/super-admin/getAllUsers',
    'createUsers': '/api/mystudio/super-admin/createUsers',
    'getUsersById': '/api/mystudio/super-admin/getUsersById',
    'updateUsers': '/api/mystudio/super-admin/updateUsers',
    'deleteUsers': '/api/mystudio/super-admin/deleteUsers',
    'getAllFeatures': '/api/mystudio/manage-features/getAllFeatures',
    'createFeatures': '/api/mystudio/manage-features/createFeatures',
    'getFeatureById': '/api/mystudio/manage-features/getFeatureById',
    'updateFeature': '/api/mystudio/manage-features/updateFeature',
    'deleteFeatures': '/api/mystudio/manage-features/deleteFeatures',
    'createCategory': '/api/mystudio/manage-features/createCategory',
    'updateCategory': '/api/mystudio/manage-features/updateCategory',
    'deleteCategory': '/api/mystudio/manage-features/deleteCategory',
    'getAllCategories': '/api/mystudio/manage-features/getAllCategories',
    'getFeaturesByCategory': '/api/mystudio/manage-features/getFeaturesByCategory',
    'getFeaturesByNewArrival': '/api/mystudio/manage-features/getFeaturesByNewArrival',
    'createOrder': '/api/mystudio/manage-features/create-order',
    'verifyPayment': '/api/mystudio/manage-features/verify-payment',
    'onImgUpload': '/api/mystudio/manage-features/onImgUpload',
    'getAllRequests': '/api/mystudio/customer-request/getAllRequests',
    'getRequestById': '/api/mystudio/customer-request/getRequestById',
    'updateRequest': '/api/mystudio/customer-request/updateRequest',
    'resolved': '/api/mystudio/customer-request/resolved',
    'toggleAdminStatus': '/api/mystudio/super-admin/toggleAdminStatus',
    'getDynamicImageUrl':'/api/mystudio/super-admin/getDynamicImageUrl',
    'insertImages':'/api/mystudio/super-admin/insertImages',
    'getAllPromocodes':'/api/mystudio/super-admin/getAllPromocodes',
    'deletePromocode':'/api/mystudio/super-admin/deletePromocode',
    'createPromocode':'/api/mystudio/super-admin/createPromocode',
    'updatePromocode':'/api/mystudio/super-admin/updatePromocode',
    'togglePromocodeStatus':'/api/mystudio/super-admin/togglePromocodeStatus',

    'verifyAndApplyPromoCode':'/api/mystudio/manage-features/verifyAndApplyPromoCode',
    'getFeatureListByUserId':'/api/mystudio/manage-features/getFeatureListByUserId',


    //Calendar
    'getCalendarEvents': '/api/mystudio/dashboard/getCalendarEvents',

    //Calling
    'getAgents': '/api/mystudio/calling/getAgents',
    'createAgent': '/api/mystudio/calling/addAgent',


  }

  token: any = '';

  constructor(public http: HttpClient) {
    this.token = localStorage.getItem("token");
  }


  getData(d: any, url: any, callback: any) {
    
    return this.http.get(environment.apiUrl + url ).subscribe((data: any) => { callback(data) }, (error: any) => callback(error));
  }

  postData(d: any, url: any, callback: any) {
    
    return this.http.post(environment.apiUrl + url, d ).subscribe((data: any) => { callback(data) }, (error: any) => callback(error));
  }

  putData(d: any, url: any, callback: any) {
    
    return this.http.put(environment.apiUrl + url, d ).subscribe((data: any) => { callback(data) }, (error: any) => callback(error));
  }

  deleteData(d: any, url: any, callback: any) {
    
    return this.http.delete(environment.apiUrl + url ).subscribe((data: any) => { callback(data) }, (error: any) => callback(error));
  }

}
