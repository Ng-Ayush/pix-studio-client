import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AlertService } from '../../services/alert.service';
import { SocketService } from '../../shared/socket.service';
declare var window: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./login.component.html",
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginPin: any = null;
  showOTPBox: boolean = false;
  loader: boolean = false;
  otp: any = null;
  userData: any = {};
  resendDisabled: boolean = false;
  countdown: number = 30;
  countdownInterval: any;
  sentOtp: any = '';
  qrCode: any = '';
  authenticated: any = 'e41779';
  ready: boolean = false;
  syncing: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private alert: AlertService,
    private socketService: SocketService,
    private activateRoute: ActivatedRoute
  ) { 
    this.activateRoute.queryParams.subscribe((params: any) => {
      if (params['event_code']) {
        this.loginPin = params['event_code'];
        this.handlePin();
      }
    })
  }


  checkOtpMaxLength(event: any) {
    let val = event.target.value.replace(/\D/g, ''); // Remove non-digits
    if (val.length > 6) val = val.substring(0, 6);
    event.target.value = val;
    this.otp = val;
  }

  handlePin() {
    if (this.loader || this.resendDisabled) return;
    this.loader = true;
    if (!this.loginPin) {
      this.alert.error("Pin is required");
      this.loader = false;
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
          const otpRes: any = await this.sendOTP();
          console.log(otpRes);
          if (otpRes.status == 200) {
            this.showOTPBox = true;
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
    this.loader = true;
    return new Promise((resolve, reject) => {
      const params: any = {
        phone_number: this.userData.phone_number,
        name: this.userData.studio_name,
        user_id: this.userData.id,
        email: this.userData.email
      }
      this.authService.sendOTP(params, (res: any) => {
        if (res.status == 200) {
          this.sentOtp = res.otp;
          this.alert.success(res.message);
          this.loader = false;
          resolve(res);
        } else {
          this.alert.error(res.message);
          this.loader = false;
          reject(res);
        }
      })
    })

  }

  handleOTP() {
    this.loader = true;
    if (this.otp != this.sentOtp) {
      this.alert.error("Invalid or Expired OTP");
      this.loader = false;
      return;
    }
    const params: any = {
      otp: this.otp || 0,
      user_id: this.userData.id
    }
    this.authService.verifyOTPAndLogin(params, (res: any) => {
      if (res.status == 200) {
        this.loader = false;
        if (window && window?.electronAPI) {
          window.electronAPI.setLogin(true);
        }
        const adminId = this.userData.id;
        this.socketService.connect(adminId);

        // this.socketService.onQR().subscribe(qr => {
        //   this.qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qr)}`;
        //   console.log("QR CODE", this.qrCode);

        // });

        // this.socketService.onAuthenticated().subscribe(() => {
        //   this.authenticated = true;
        //   this.syncing = true;  // Start syncing after auth
        //   this.qrCode = null;
        // });

        // this.socketService.onReady().subscribe(() => {
        //   this.ready = true;
        //   this.syncing = false; // Sync complete
        // });
        
        this.router.navigate(['/dashboard']);
        this.alert.success(res.message);
      } else {
        this.loader = false;
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

  removeSpaces() {
    this.loginPin = this.loginPin.replace(/\s+/g, '');
  }

  removeOtpSpaces() {
    this.otp = this.otp.replace(/\s+/g, '');
  }
}
