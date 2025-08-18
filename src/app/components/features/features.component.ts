import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { interval } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AdminService } from '../../services/admin.service';
import { environment } from '../../../environments/environment';
import { AlertService } from '../../services/alert.service';
import { FormsModule } from '@angular/forms';
import { LoaderService } from '../../shared/loader.service';
import { ScrollingModule } from '@angular/cdk/scrolling';
declare var Razorpay: any;
@Component({
  selector: 'app-features',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule,ScrollingModule],
  templateUrl: './features.component.html',
  styleUrl: './features.component.scss'
})
export class FeaturesComponent {

  stats: any;
  todayDate: any = new Date();
  showDriveLink: boolean = false;
  showVideoModal = false
  selectedCard: any | null = null
  currentVideoUrl: SafeResourceUrl = "";
  features: any = [];
  currentDriveLink: any = '';
  categoryList: any[] = [];
  selectedCategory: any = null;
  selectedCatName: any = 'New Arrival Features';
  userData: any = {};
  showLogOutModal: boolean = false;

  constructor(
    private router: Router,
    private sanitizer: DomSanitizer,
    private _adminService: AdminService,
    private alert: AlertService,
    private loader: LoaderService
  ) {
    this.userData = JSON.parse(<any>localStorage.getItem("userData"));
  }

  ngOnInit() {
    this.getRealTime();
    this.getFeaturesByNewArrival();
    this.getAllCategories();
  }


  getFeaturesByNewArrival() {
    this.loader.show();
    this._adminService.getFeaturesByNewArrival((res: any) => {
      if (res.status == 200) {
        this.features = res.data;
        this.sanitizeVideoUrl();
        this.loader.hide();
      } else {
        this.loader.hide();
        this.alert.error(res.message);
      }
    })
  }

  sanitizeVideoUrl() {
    this.features.forEach((card: any) => {
      const randomVideoId = this.extractYoutubeId(card.youtube_url);
      const videoUrl = `https://www.youtube.com/embed/${randomVideoId}?autoplay=1&rel=0&modestbranding=1&controls=1`
      card.youtube_url = this.sanitizer.bypassSecurityTrustResourceUrl(videoUrl)
    });
  }

  getAllCategories() {
    this.loader.show();
    this._adminService.getAllCategories((res: any) => {
      if (res.status == 200) {
        this.categoryList = res.data;
        this.loader.hide();
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

  playVideo(card: any): void {
    this.selectedCard = card;
    // const randomVideoId = this.extractYoutubeId(card.youtube_url);
    // const videoUrl = `https://www.youtube.com/embed/${randomVideoId}?autoplay=1&rel=0&modestbranding=1&controls=1`
    // this.currentVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(videoUrl)
    this.currentVideoUrl = card.youtube_url;
    this.showVideoModal = true;
    this.currentDriveLink = card.drive_url;
  }

  extractYoutubeId(url: any) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|shorts\/|)([^#&?]+)/;
    const match = url.match(regex);

    if (match && match[1]) {
      return match[1];
    } else {
      return null;
    }
  }

  payNow() {
    // 1. Create Razorpay order
    const params: any = {
      amount: this.selectedCard.price,
      currency: 'INR',
      receipt: 'order_rcptid_11',
    };

    this._adminService.createOrder(params, (order: any) => {

      console.log("ORDER ", order);

      const options: any = {
        key: environment.razorpay_key,
        amount: order.data.amount,
        currency: order.data.currency,
        name: 'Suraj Studio',
        description: 'Test Transaction',
        order_id: order.data.id,
        handler: (response: any) => {
          // 2. Send payment info to backend for verification
          console.log("GOTHE ORDER", response);

          let data = { razorpay_payment_id: response.razorpay_payment_id, razorpay_order_id: response.razorpay_order_id, razorpay_signature: response.razorpay_signature }
          this._adminService.verifyPayment(data, (res: any) => {
            console.log("GOT PAYMENT", res);

            if (res.status == 200) {
              this.alert.success(res.message);
              this.showVideoModal = false;
              this.showDriveLink = true;
              this.automaticStartDownload();
              this.alert.success("Feature bought successfully");
            } else {
              this.showVideoModal = false;
              // this.showDriveLink = true;
              // this.automaticStartDownload();
              // this.alert.success("Feature bought successfully");
              this.alert.error(res.message);
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

  automaticStartDownload() {
    const fileId = this.extractFileId(this.currentDriveLink);
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    this.currentDriveLink = downloadUrl;
    try {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = '';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        this.showDriveLink = false;
      }, 300);
    }
    catch (error: any) {
      this.alert.error("Error in downloading the file, copy paste the url in new tab")
    }
  }

  extractFileId(url: string): string | null {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
    return match ? match[1] : null;
  }

  selectCategory(category: any) {
    this.selectedCategory = category.category_id;
    this.selectedCatName = category.category_name;
    this.getFeaturesByCategory();
  }

  getFeaturesByCategory() {
    this.loader.show();
    this._adminService.getFeaturesByCategory(this.selectedCategory, (res: any) => {
      if (res.status == 200) {
        this.features = res.data;
        this.sanitizeVideoUrl();
        console.log(res.data);
        this.loader.hide();
      } else {
        this.alert.error(res.message);
      }
    })
  }

  trackByFn(index: number, item: any) {
    return item.id;
  }

  resetFilter() {
    this.selectedCategory = null;
    this.selectedCatName = 'New Arrival Features'
    this.getFeaturesByNewArrival();
  }

  toggleLogoutModal() {
    this.showLogOutModal = !this.showLogOutModal;
  }

  logout() {
    this.showLogOutModal = false;
    localStorage.clear();
    this.alert.success('Logout Successfully');
    this.router.navigate(['/login']);
  }

  trackByCdkFn(index: number, item: any) {
    return item.id;
  }

}
