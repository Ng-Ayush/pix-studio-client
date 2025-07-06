import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./login.component.html",
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  isLogin = true;
  email = '';
  password = '';
  name = '';
  loginPin: any = null;
  showOTPBox: boolean = false;
  loader: boolean = false;
  otp: any = null;
  userData:any={};

  constructor(
    private authService: AuthService,
    private router: Router,
    private alert: AlertService
  ) { }

  onSubmit() {
    if (this.isLogin) {
      this.authService.login(this.email, this.password).subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (error) => console.error('Login failed:', error)
      });
    } else {
      this.authService.register(this.email, this.password, this.name).subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (error) => console.error('Registration failed:', error)
      });
    }
  }

  toggleForm() {
    this.isLogin = !this.isLogin;
  }

  checkMaxLength(event: any) {
    let val = event.target.value.replace(/\D/g, ''); // Remove non-digits
    if (val.length > 5) val = val.substring(0, 6);
    event.target.value = val;
    this.loginPin = val;
  }

  checkOtpMaxLength(event: any) {
    let val = event.target.value.replace(/\D/g, ''); // Remove non-digits
    if (val.length > 6) val = val.substring(0, 6);
    event.target.value = val;
    this.otp = val;
  }

  handlePin() {
    this.loader = true;
    const params: any = {
      pin: this.loginPin
    };
    this.authService.getOTPForPinUser(params, (res: any) => {
      if (res.status == 200) {
     let currentUser:any = res.user_id;
        localStorage.setItem("currentUserId", JSON.stringify(currentUser))
        this.alert.success(res.message);
        this.showOTPBox = true;
        this.loader = false;
        this.userData = res;
        this.sendOTP(this.userData);
      } else {
        this.showOTPBox = false;
        this.loader = false;
        this.alert.error(res.message);
      }
    })
  }

  sendOTP(userData: any) {
    const params: any = {
      phone_number: userData.phone_number,
      name: userData.name,
      user_id: userData.user_id
    }
    this.authService.sendOTP(params, (res: any) => {
      if (res.status == 200) {
        console.log(res);
        this.alert.success(res.message);
      } else {
        this.alert.error(res.message);
      }
    })
  }

  handleOTP(){
    const params: any = {
      otp: this.otp,
      user_id: this.userData.user_id
    }
    this.authService.verifyOTPAndLogin(params, (res: any) => {
      if (res.status == 200) {
        console.log(res);
        this.alert.success(res.message);
        localStorage.setItem('token', res.token);
        // localStorage.setItem('user', JSON.stringify(res.user));
        this.router.navigate(['/dashboard']);
      } else {
        this.alert.error(res.message);
      }
    })
  }
}
