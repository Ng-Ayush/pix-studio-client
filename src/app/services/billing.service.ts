import { Injectable } from '@angular/core';
import { BaseService } from './base.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class BillingService extends BaseService {

  constructor(
    http: HttpClient,
  ) {
    super(http)
  }

  createParty(params:any,callback:any){
    return this.postData(params, this.httpUrls['createParty'], callback)
  }
  
  getAllParty(callback:any){
    return this.getData({}, this.httpUrls['getAllParty'], callback)
  }

  getPartyById(id:any,callback:any){
    return this.getData({}, this.httpUrls['getPartyById']+"/"+ id, callback)
  }

  updateParty(id:any,params:any,callback:any){
    return this.putData(params, this.httpUrls['updateParty']+"/"+ id, callback)
  }

  deleteParty(id:any,callback:any){
    return this.deleteData({}, this.httpUrls['deleteParty']+"/"+id, callback)
  }

  addInvoiceItem(params:any,callback:any){
    return this.postData(params,this.httpUrls['addInvoiceItem'],callback)
  }
  
  getAllInvoiceItems(callback:any){
    return this.getData({}, this.httpUrls['getAllInvoiceItems'], callback)
  }
  
  getInvoiceItemById(id:any,callback:any){
    return this.getData({}, this.httpUrls['getInvoiceItemById'] + "/" + id , callback)
  }

  updateInvoiceItem(id:any,params:any,callback:any){
    return this.putData(params, this.httpUrls['updateInvoiceItem']+"/"+ id, callback)
  }

  generateInvoice(params:any,callback:any){
    return this.postData(params, this.httpUrls['generateInvoice'], callback)
  }

  getInvoiceByPartyId(id:any,callback:any){
    return this.getData({}, this.httpUrls['getInvoiceByPartyId']+"/"+ id, callback)
  }
  
  getInvoiceDetailByInvoiceNumber(id:any,callback:any){
    return this.getData({}, this.httpUrls['getInvoiceDetailByInvoiceNumber']+"/"+ id, callback)
  }
}
