import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor(private toastr: ToastrService) {

   }

   success(message:any,duration=3000){
    this.toastr.success(message,"Success",{
      timeOut: duration,
      progressAnimation:'decreasing',
      progressBar:true
    })
   }
   

   warning(message:any,duration=3000){
    this.toastr.warning(message,"Warning",{
      timeOut: duration,
      progressAnimation:'decreasing',
      progressBar:true
    })
   }

   error(message:any,duration=3000){
    this.toastr.error(message,"Error",{
      timeOut: duration,
      progressAnimation:'decreasing',
      progressBar:true
    })
   }

   info(message:any,duration=3000){
    this.toastr.info(message,"Info",{
      timeOut: duration,
      progressAnimation:'decreasing',
      progressBar:true
    })
   }

}
