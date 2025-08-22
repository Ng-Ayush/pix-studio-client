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
  userData: any = {};
  resendDisabled: boolean = true;
  countdown: number = 30;
  countdownInterval: any;

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


  checkOtpMaxLength(event: any) {
    let val = event.target.value.replace(/\D/g, ''); // Remove non-digits
    if (val.length > 6) val = val.substring(0, 6);
    event.target.value = val;
    this.otp = val;
  }

  handlePin() {
    this.loader = true;
    if (!this.loginPin) {
      this.alert.error("Pin is required");
      return;
    }
    const params: any = {
      pin: this.loginPin
    };
    this.authService.getOTPForPinUser(params, async (res: any) => {
      if (res.status == 200) {
        if (res.role == 'admin') {
          this.alert.success(res.message);
          let currentUser: any = res.user_id;
          localStorage.setItem("currentUserId", JSON.stringify(currentUser))
          localStorage.setItem("userData", JSON.stringify(res.userData));
          localStorage.setItem('token', res.token);
          this.userData = res.userData;
          this.showOTPBox = true;
          const otpRes = await this.sendOTP();
          console.log(otpRes);
          if (this.showOTPBox) {
            this.startResendCountdown();
          }

        } else if (res.role == 'customer' && !res.is_event_submitted) {
          localStorage.setItem("uniqueCode", this.loginPin);
          localStorage.setItem("userData", JSON.stringify(res.data));
          this.router.navigate(['/selection/folder-listing-screen']);
        } else if (res.role == 'customer' && res.is_event_submitted) {
          this.alert.info("Event already submitted");
        } else if (res.role == 'ai_customer') {
          localStorage.setItem("userData", JSON.stringify(res.data));
          this.router.navigate(['/ps']);
        }
        this.loader = false;
      } else {
        this.showOTPBox = false;
        this.loader = false;
        this.alert.error(res.message);
      }
    })
  }

  async sendOTP() {
    return new Promise((resolve, reject) => {
      const params: any = {
        phone_number: this.userData.phone_number,
        name: this.userData.studio_name,
        user_id: this.userData.id
      }
      this.authService.sendOTP(params, (res: any) => {
        if (res.status == 200) {
          this.alert.success(res.message);
          resolve(res);
        } else {
          this.alert.error(res.message);
          reject(res);
        }
      })
    })

  }

  handleOTP() {
    const params: any = {
      otp: this.otp || 0,
      user_id: this.userData.user_id
    }
    this.authService.verifyOTPAndLogin(params, (res: any) => {
      if (res.status == 200) {
        this.router.navigate(['/dashboard']);
        this.alert.success(res.message);
      } else {
        this.alert.error(res.message);
      }
    })
  }

  resendOTP() {
    this.sendOTP();
    this.startResendCountdown();
  }

  startResendCountdown() {
    this.resendDisabled = true;
    this.countdown = 30;

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.countdownInterval = setInterval(() => {
      this.countdown--;

      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
        this.resendDisabled = false;
      }
    }, 1000);
  }
}
