import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor(private toastr: ToastrService) {

   }

   success(message:any){
    this.toastr.success(message,"Success",{
      timeOut: 3000,
      progressAnimation:'decreasing',
      progressBar:true
    })
   }
   

   warning(message:any){
    this.toastr.success(message,"Warning",{
      timeOut: 3000,
      progressAnimation:'decreasing',
      progressBar:true
    })
   }

   error(message:any){
    this.toastr.success(message,"Error",{
      timeOut: 3000,
      progressAnimation:'decreasing',
      progressBar:true
    })
   }

   info(message:any){
    this.toastr.success(message,"Info",{
      timeOut: 3000,
      progressAnimation:'decreasing',
      progressBar:true
    })
   }

}
