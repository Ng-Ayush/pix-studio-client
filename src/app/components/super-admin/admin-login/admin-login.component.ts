import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertService } from '../../../services/alert.service';
import { AdminService } from '../../../services/admin.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss'
})
export class AdminLoginComponent {

  loginForm:any;
constructor(private fb:FormBuilder, private alert:AlertService, private service:AdminService, private router:Router){

  this.loginForm = this.fb.group({
    email:['',[Validators.required]],
    password:['',[Validators.required]]
  })
}


adminLogin(){
  let email = this.loginForm.get("email").value;
  let password = this.loginForm.get("password").value;
  if(!email){
    this.alert.warning('email is required !')
    return;
  }
  if(!password){
    this.alert.warning('password is required !');
    return;
  }

  this.service.adminLogin(this.loginForm.value,(res:any)=>{
    if(res.token){
      this.alert.success("login success")
      this.router.navigate(['/admin/dashboard'])

      
    }else{
      this.alert.error("Invalid credential")
    }
    
  })


console.log(this.loginForm.value);

}


}
