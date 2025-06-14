import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CustomerService } from '../../services/customer.service';

@Component({
  selector: 'app-customer-auth-screen',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './customer-auth-screen.component.html',
  styleUrl: './customer-auth-screen.component.scss'
})
export class CustomerAuthScreenComponent {

  uniqueCode:any= null;
  loader:boolean=false;

  constructor(private router:Router,private customerService:CustomerService){}


  verifyCode(){
    this.loader =true;
    this.customerService.verifyUniqueCode({code:this.uniqueCode},(res:any)=>{
      if(res.status == 200 && !res.is_event_submitted){
        this.loader = false;
        localStorage.setItem("uniqueCode",this.uniqueCode)
        this.router.navigate(['/selection/folder-listing-screen']);
      }else if(res.is_event_submitted){
        this.loader = false;
        alert("Event already submitted");
      }
    })
  }

}
