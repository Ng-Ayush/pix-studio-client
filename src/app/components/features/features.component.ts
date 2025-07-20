import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { interval } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AdminService } from '../../services/admin.service';
import { environment } from '../../../environments/environment';
import { AlertService } from '../../services/alert.service';
declare var Razorpay: any;
@Component({
  selector: 'app-features',
  standalone: true,
  imports: [CommonModule, RouterModule,],
  templateUrl: './features.component.html',
  styleUrl: './features.component.scss'
})
export class FeaturesComponent {

  stats: any;
  todayDate: any = new Date();
  showDriveLink: boolean = false;
  showVideoModal = false
  selectedCard: any | null = null
  currentVideoUrl: SafeResourceUrl = ""

  // Sample YouTube video IDs for random selection
  private youtubeVideoIds = [
    "dQw4w9WgXcQ", // Rick Roll
    "9bZkp7q19f0", // Gangnam Style
    "kJQP7kiw5Fk", // Despacito
    "fJ9rUzIMcZQ", // Bohemian Rhapsody
    "hTWKbfoikeg", // Smells Like Teen Spirit
    "YQHsXMglC9A", // Hello - Adele
    "CevxZvSJLk8", // Katy Perry - Roar
    "JGwWNGJdvx8", // Shape of You
    "M7lc1UVf-VE", // Uptown Funk
    "RgKAFK5djSk", // See You Again
  ]
  features: any = [];


  constructor(
    private router: Router,
    private sanitizer: DomSanitizer,
    private _adminService: AdminService,
    private alert: AlertService
  ) { }

  ngOnInit() {
    this.getRealTime();
    this.getAllFeatures()
  }


  getAllFeatures() {
    this._adminService.getAllFeatures((res: any) => {
      if (res.status == 200) {
        this.features = res.data;
        console.log(res.data);

      } else {
        this.alert.error(res.message);
      }
    })
  }

  getRealTime() {
    interval(1000).subscribe(() => {
      this.todayDate = new Date();
    })
  }

  logout() {
    this.router.navigate(['/login']);
  }



  playVideo(card: any): void {
    this.selectedCard = card;
    const randomVideoId = this.youtubeVideoIds[Math.floor(Math.random() * this.youtubeVideoIds.length)]
    const videoUrl = `https://www.youtube.com/embed/${randomVideoId}?autoplay=1&rel=0&modestbranding=1&controls=1`
    this.currentVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(videoUrl)
    this.showVideoModal = true;
  }

  payNow() {
    // 1. Create Razorpay order
    const params: any = {
      amount: 50000,
      currency: 'INR',
      receipt: 'order_rcptid_11',
    };

    this._adminService.createOrder(params, (order: any) => {

      console.log("ORDER ", order);

      const options: any = {
        key: environment.razorpay_key,
        amount: order.amount,
        currency: order.currency,
        name: 'Suraj Studio',
        description: 'Test Transaction',
        order_id: order.id,
        handler: (response: any) => {
          // 2. Send payment info to backend for verification
          console.log("GOTHE ORDER", response);

          let data = { razorpay_payment_id: response.razorpay_payment_id, razorpay_order_id: response.razorpay_order_id, razorpay_signature: response.razorpay_signature }
          this._adminService.verifyPayment(data, (res: any) => {
            console.log("GOT PAYMENT", res);

            if (res.status == 200) {
              this.alert.success(res.message);
            } else {
              this.showVideoModal = false;
              this.showDriveLink = true;
              this.alert.success("Feature bought successfully");
              // this.alert.error(res.message);
            }
          })
        },
        prefill: {
          name: 'Test User',
          email: 'test@example.com',
          contact: '9999999999',
        },
        theme: {
          color: '#3399cc',
        },
      };

      const razorpay = new Razorpay(options);
      razorpay.open();
    });
  }

  closeVideo(): void {
    this.showVideoModal = false
    this.selectedCard = null
    this.currentVideoUrl = ""
  }

  copyDriveLink(event: any) {
    console.dir(event.defaultValue);
    const message = event.defaultValue;
    navigator.clipboard.writeText(message).then(() => {
      this.alert.success('Copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }

}
