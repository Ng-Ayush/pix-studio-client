import { Component, inject } from '@angular/core';
import { AlertService } from '../../services/alert.service';
import { PhotoSelectionService } from '../../services/photo-selection.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CustomerService } from '../../services/customer.service';
import * as QRCode from 'qrcode';
import { FormsModule } from '@angular/forms';
import { LoaderService } from '../../shared/loader.service';
import { AdminService } from '../../services/admin.service';
import { environment } from '../../../environments/environment';
import { FaceDescReadinessComponent } from '../shared/face-desc-readiness/face-desc-readiness.component';
import { Storage, ref, uploadBytesResumable, getDownloadURL, uploadBytes } from '@angular/fire/storage';
import { ImageCompressionService } from '../../services/image-compression.service';
import { MemoryGameComponent } from '../../shared/memory-game/memory-game.component';

declare var Razorpay: any;
@Component({
  selector: 'app-ai-photo-sharing',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, FaceDescReadinessComponent, MemoryGameComponent],
  templateUrl: './ai-photo-sharing.component.html',
  styleUrl: './ai-photo-sharing.component.scss'
})
export class AiPhotoSharingComponent {

  todayDate: any = new Date();
  customers: any = [];
  storage = inject(Storage);
  photoSharingEnabled = false;
  photoQualities = ['Basic', 'Standard', 'High'];
  selectedQuality = 'Basic';
  isModalOpen: boolean = false;
  event_config: any = { watermark: {}, need_customer_number: true };
  eventList: any = [];
  isEdit: boolean = false;
  deleteModal: boolean = false;
  currentEventId: number = -1;
  filteredEvents: any = [];
  filteredCustomer: any = [];
  searchQuery: any = '';
  selectedParty: any = '';
  dropdownOpen: boolean = false;
  partyModal: boolean = false;
  customerConfig: any = {};
  userData: any = {};
  isAiPaymentDone: boolean = false;
  showPaymentModal: boolean = false;
  planConfig: any = { price: 49, plan: "month" };
  showLogOutModal: boolean = false;
  isLoading: boolean = false;
  activeTab: any = 'create';
  preview: any = { cover1: '', cover2: '' };
  transparencyValue: any = null;
  toggleWaterMark: boolean = false;
  totalUploadedPhotosCount: any = 0;
  percentage: number = 0;
  progressClass: string = 'progress-green';
  selectedTemplate: any = '';

  constructor(
    private alert: AlertService,
    private router: Router,
    private eventService: PhotoSelectionService,
    private service: CustomerService,
    // private faceService: FaceRecognitionService,
    private loader: LoaderService,
    private customerService: CustomerService,
    private _adminService: AdminService,
    private imageCompressService: ImageCompressionService

  ) {
    this.userData = JSON.parse(<any>localStorage.getItem("userData"));
  }

  ngOnInit() {
    this.getAllEvents();
    this.getAllCustomers();
    // this.getTotalUploadedAiPhotosCount();
  }


  getAllEvents() {
    this.loader.show();
    this.eventService.getAllEvents((res: any) => {
      if (res.status == 200) {
        this.eventList = res.data.filter((item: any) => item.is_ai_upload);
        this.filteredEvents = [...this.eventList];
        this.loader.hide();
        this.getTotalUploadedAiPhotosCount();
      } else {
        this.alert.error(res.message);
        this.loader.hide();
      }
    });

  }

  getTotalUploadedAiPhotosCount() {
    this.eventService.getTotalUploadedAiPhotosCount((res: any) => {
      if (res.status == 200) {
        console.log("Total AI Uploaded Photos Count: ", res.data);
        this.totalUploadedPhotosCount = res.data;
        localStorage.setItem('totalAiUploadedPhotosCount', res.data);
        this.updateProgress();
      } else {
        this.alert.error(res.message);
      }
    });
  }

  getAllCustomers() {
    this.service.getAllCustomers((res: any) => {
      if (res.status == 200) {
        this.customers = res.data.filter((item: any) => item.is_ai_customer);
        this.filteredCustomer = [...this.customers];
      }else{
        this.alert.error(res.message);
      }
    })
  }


  onCancel() {
    this.isModalOpen = false;
    this.isEdit = false;
    this.deleteModal = false;
    this.selectedTemplate = '';
  }

  openPriceModal() {
    if (!this.event_config.customer_id || !this.event_config.event_name) {
      this.alert.error("Please select customer and event name");
      return;
    }
    this.showPaymentModal = true;
  }

  onSave() {

    if (!this.event_config.customer_id || !this.event_config.event_name) {
      this.alert.error("Please select customer and event name");
      return;
    }
    if (!this.isEdit && (!this.event_config.cover1 || !this.event_config.cover2)) {
      this.alert.error("Please select cover photos");
      return;
    }

    if (!this.event_config?.selected_template) {
      this.alert.error("Please select template");
      return;
    }

    if (!this.isEdit) {

      const params: any = {
        customer_id: this.event_config.customer_id,
        event_name: this.event_config.event_name,
        is_event_submitted: false,
        is_ai_upload: true,
        quality: this.event_config.quality,
        plan_data: this.planConfig,
        browse_all_photo_ai: this.event_config?.browse_all_photo_ai || false,
        razorpay_payment_id: this.event_config?.payment_data?.razorpay_payment_id || '',
        razorpay_order_id: this.event_config?.payment_data?.razorpay_order_id || '',
        razorpay_signature: this.event_config?.payment_data?.razorpay_signature || '',
        ai_cover_images: JSON.stringify([{ url: this.event_config?.cover1 }, { url: this.event_config?.cover2 }]),
        watermark: JSON.stringify({ is_watermark: this.toggleWaterMark, transparency: this.transparencyValue }),
        youtube_cover_url: this.event_config?.youtube_cover_url || '',
        need_customer_number: this.event_config?.need_customer_number || false,
        google_review_url: this.event_config?.google_review_url || '',
        selected_template: this.event_config?.selected_template || 'template1',
        photo_quality: this.event_config?.photo_quality ? this.event_config?.photo_quality : 'basic',
        event_date: this.event_config?.event_date ? this.event_config?.event_date : null
      };

      this.eventService.createEvent(params, (res: any) => {
        if (res.status == 200) {
          this.isModalOpen = false;
          this.alert.success(res.message);
          this.getAllEvents();
        } else {
          this.alert.error(res.message);
        }
      })
    } else {
      const params = {
        event_name: this.event_config.event_name,
        is_event_submitted: this.event_config.is_event_submitted,
        browse_all_photo_ai: this.event_config?.browse_all_photo_ai || false,
        ai_cover_images: JSON.stringify([{ url: this.event_config?.cover1 ?? this.event_config?.ai_cover_images[0]?.url }, { url: this.event_config?.cover2 ?? this.event_config?.ai_cover_images[1]?.url }]),
        watermark: JSON.stringify({ is_watermark: this.toggleWaterMark, transparency: this.transparencyValue }),
        youtube_cover_url: this.event_config?.youtube_cover_url || '',
        need_customer_number: this.event_config?.need_customer_number || false,
        google_review_url: this.event_config?.google_review_url || '',
        selected_template: this.event_config?.selected_template || 'template1',
        photo_quality: this.event_config?.photo_quality ? this.event_config?.photo_quality : 'basic',
        event_date: this.event_config?.event_date ? this.event_config?.event_date : null
      }
      console.log(params);

      this.eventService.updateEvent(params, this.event_config.event_id, (res: any) => {


        if (res.status == 200) {
          this.isModalOpen = false;
          this.alert.success(res.message);
          this.getAllEvents();
        } else {
          this.alert.error(res.message);
        }
      })
    }
  }

  openModal() {
    this.isModalOpen = true;
    console.log(this.event_config);
    this.activeTab = 'create';
    this.selectedParty = '';
    this.searchQuery = '';
    this.isEdit = false;
    this.event_config.watermark = { is_watermark: false, transparency: null };
    this.event_config.need_customer_number = true;
    this.event_config.selected_template = this.event_config?.selected_template ?? 'template1';
    this.event_config.photo_quality_enabled = false;
    this.customerConfig = {};
    this.preview = {};
  }

  selectQuality(quality: string) {
    this.selectedQuality = quality;
    this.event_config.quality = this.selectedQuality;
  }

  editModal(event: any) {
    this.isEdit = true;
    this.isModalOpen = true;
    this.event_config = event;
    this.preview['cover1'] = event.ai_cover_images[0]?.url;
    this.preview['cover2'] = event.ai_cover_images[1]?.url;
    this.selectParty({ name: this.event_config.customer_name, id: this.event_config.customer_id });
    this.event_config.watermark = event.watermark && typeof (event.watermark) == 'string' ? JSON.parse(event.watermark) : { is_watermark: false, transparency: null };
    this.event_config.photo_quality_enabled = event.photo_quality != 'basic' ? true : false;
    console.log(event);
  }

  goToPhotoSelection(id: any) {
    this.router.navigate(['/photo-selection-folder', id], { queryParams: { ai_uploaded: true } });
  }

  toggleDeleteModal(id: any) {
    this.deleteModal = true;
    this.event_config.event_id = id;
  }

  deleteEvent() {
    this.eventService.deleteEvent(this.event_config.event_id, (res: any) => {
      if (res.status == 200) {
        this.alert.success(res.message);
        this.onCancel();
        this.getAllEvents();
      } else {
        this.alert.error(res.message);
      }
    })
  }

  get message(): string {
    return ``;
  }


  copyAiShareLink(event: any) {
    const message = `Dear *${event.customer_name}*,\nYour photos for event *${event.event_name}* is ready to download. Your event code is *${event.customer_unique_id}*\n\n*Website* : ${window.location.origin}/login?event_code=${event.customer_unique_id}&date=${new Date().getTime()} \n\nRegards *${this.userData?.studio_name}*`;
    console.log(message);

    navigator.clipboard.writeText(message).then(() => {
      this.alert.success('Unique code copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy message: ', err);
    });
  }

  toggleEventStatus(event: any) {
    const params = {
      is_event_submitted: !event.is_event_submitted,
    }
    this.eventService.updateEvent(params, event.event_id, (res: any) => {
      if (res.status == 200) {
        this.alert.success(res.message);
        this.getAllEvents();
      } else {
        this.alert.error(res.message);
      }
    })
  }

  search(event: any) {
    if (event.target.value == '') {
      this.filteredEvents = [...this.eventList];
    } else {
      this.filteredEvents = this.eventList.filter((item: any) => item.event_name.toLowerCase().includes(event.target.value.toLowerCase()) || item.customer_name.toLowerCase().includes(event.target.value.toLowerCase()) || item.customer_phone.includes(event.target.value.toLowerCase()));
    }
  }

  async downloadQR(event: any) {
    //    const qrData = {
    //   couple: 'Mahima & Shekhar',
    //   date: '11.12.2024',
    //   studio: 'Neeraj Studios',
    //   code: '445566',
    //   contact: '45559773336545',
    //   url: `${window.location.origin}/ps`
    // };

    // const qrString = JSON.stringify(qrData);

    //   QRCode.toDataURL(qrString)
    //     .then(qrDataUrl => {
    //       const a = document.createElement('a');
    //       a.href = qrDataUrl;
    //       a.download = `mystudio-qr_${event.event_name}.png`;
    //       document.body.appendChild(a); // Required for Firefox
    //       a.click();
    //       document.body.removeChild(a);
    //     })
    //     .catch(err => {
    //       console.error('QR Code generation failed', err);
    //     });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const width = 600;
    const height = 800;
    canvas.width = width;
    canvas.height = height;

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Fonts
    ctx.fillStyle = '#2e3b20';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';

    ctx.fillText(event.customer_name, width / 2, 60);

    ctx.font = '24px Arial';
    ctx.fillText(event.event_date || new Date().toLocaleDateString('en-US'), width / 2, 100);

    const url = `${window.location.origin}/login?event_code=${event.customer_unique_id}`;
    const qrDataUrl = await QRCode.toDataURL(url);
    const qrImage = new Image();
    qrImage.src = qrDataUrl;
    qrImage.onload = () => {
      const qrSize = 300;
      ctx.drawImage(qrImage, (width - qrSize) / 2, 150, qrSize, qrSize);

      ctx.font = '20px Arial';

      ctx.fillText(`USE CODE: ${event.customer_unique_id}`, width / 2, 500);

      ctx.font = '22px Arial';
      ctx.fillText(this.userData?.studio_name, width / 2, 540);

      ctx.font = '18px Arial';
      ctx.fillText(`CONT- ${this.userData?.phone_number}`, width / 2, 580);

      const downloadLink = document.createElement('a');
      downloadLink.href = canvas.toDataURL('image/png');
      downloadLink.download = 'qr_invitation.png';
      downloadLink.click();
    };
  }

  publishAiPhotos(event: any) {
    // if (event.ai_guests.length == 0) return;
    // console.log(event);
    // const data: any = this.faceService.filterPhotosByFaceMatch(event.ai_guests[0].image_url, event.photos)
    // console.log(data);
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
    if (this.dropdownOpen) {
      this.filterParty();
    }
  }

  filterParty(): void {
    const query = this.searchQuery.toLowerCase();
    this.filteredCustomer = this.customers.filter((item: any) =>
      item.name
        .toLowerCase().includes(query) && this.filteredEvents.every((event: any) => event.customer_id != item.id)
    );
  }

  addNewPartyModal() {
    this.partyModal = true;
  }

  selectParty(item: any): void {
    this.selectedParty = item.name;
    this.searchQuery = item.name;
    this.dropdownOpen = false;
    this.event_config.customer_id = item.id;
  }

  closeModal() {
    this.isEdit = false;
    this.partyModal = false;
  }

  saveParty() {
    this.loader.show();
    if (!this.customerConfig.firstName || !this.customerConfig.lastName || !this.customerConfig.phone) {
      this.loader.hide();
      this.alert.error('Please fill all the fields');
      return;
    }
    const params: any = { name: `${this.customerConfig.firstName} ${this.customerConfig.lastName}`, phone: this.customerConfig.phone, ...this.customerConfig, is_ai_customer: true };
    this.customerService.createCustomer(params, (res: any) => {
      if (res.status == 200) {
        this.alert.success(res.message);
        this.loader.hide();
        this.closeModal();
        this.getAllCustomers();
      } else {
        this.alert.error(res.message);
        this.loader.hide();
      }
    })

  }

  payNow(price: any) {
    // 1. Create Razorpay order
    this.planConfig.price = price;
    const params: any = {
      amount: this.planConfig.price,
      currency: 'INR',
      receipt: 'ai_event_plan',
    };

    this._adminService.createOrder(params, (order: any) => {

      console.log("ORDER ", order);

      const options: any = {
        key: environment.razorpay_key,
        amount: order.data.amount,
        currency: order.data.currency,
        name: this.userData?.studio_name,
        description: 'Test Transaction',
        order_id: order.data.id,
        handler: (response: any) => {
          let data = { razorpay_payment_id: response.razorpay_payment_id, razorpay_order_id: response.razorpay_order_id, razorpay_signature: response.razorpay_signature, amount: this.planConfig.price }
          this._adminService.verifyPayment(data, (res: any) => {
            if (res.status == 200) {
              this.alert.success(res.message);
              this.showPaymentModal = false;
              this.event_config = { ...this.event_config, payment_data: data, plan_data: this.planConfig };
              this.onSave();
            } else {
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

  selectPlan(plan: string, price: any) {
    this.planConfig.plan = plan;
    this.planConfig.price = price;
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

  async onImageUpload(event: Event, type: 'cover1' | 'cover2') {
    console.log(323);
    this.isLoading = true;

    const input: any = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const reader = new FileReader();
    const fileRef = ref(this.storage, `AI-Event-Cover-Photo/${this.event_config.event_name || 'event'}_${this.userData.id}/${type}`);
    const blob = await this.imageCompressService.compress3MBToTarget(input.files[0])
    const uploadTask = uploadBytes(fileRef, blob);

    uploadTask.then(async () => {
      const url = await getDownloadURL(fileRef);
      this.isLoading = false;
      this.preview[type] = url;
      this.event_config[type] = url;
    });
  }

  showWarning() {
    this.alert.info("Please upgrade your plan to use this feature", 3000);
  }

  setWatermarkTransparency(value: any) {
    this.transparencyValue = value;
    this.event_config.watermark.transparency = value;
  }

  toggleWaterMarkEvent(event: any) {
    this.toggleWaterMark = event.target.checked;
    this.event_config.watermark.is_watermark = event.target.checked
    if (!event.target.checked) {
      this.transparencyValue = null;
      this.event_config.watermark.transparency = null;
    }
  }

  toggleNeedCustomerNumber(event: any) {
    this.event_config.need_customer_number = event.target.checked;
  }

  updateProgress(): void {
    if (this.userData?.allowed_photos_quantity > 0) {
      this.percentage = (this.totalUploadedPhotosCount / this.userData?.allowed_photos_quantity) * 100;
    } else {
      this.percentage = 0;
    }

    // Update color based on percentage
    if (this.percentage >= 90) {
      this.progressClass = 'progress-red';
    } else if (this.percentage >= 60) {
      this.progressClass = 'progress-yellow';
    } else {
      this.progressClass = 'progress-green';
    }
  }
  getTemplateImage(template: string, device: string): string {
    const templates: any = {
      template1: {
        laptop: "https://firebasestorage.googleapis.com/v0/b/surajproductions-3f28b.firebasestorage.app/o/AI-Event-Preview-Cover-Photo%2FScreenshot%202025-11-01%20012036.png?alt=media&token=93a88de0-b435-4f4e-9652-3a49e4346c3e",
        mobile: "https://firebasestorage.googleapis.com/v0/b/surajproductions-3f28b.firebasestorage.app/o/AI-Event-Preview-Cover-Photo%2FScreenshot%202025-11-01%20012111.png?alt=media&token=4441d9bd-ad98-44ed-aa15-5637d3227e7a"
      },
      template2: {
        laptop: "https://firebasestorage.googleapis.com/v0/b/surajproductions-3f28b.firebasestorage.app/o/AI-Event-Preview-Cover-Photo%2FScreenshot%202025-11-01%20012218.png?alt=media&token=3d20ebd4-d0b1-4654-8d40-e963ba383dbf",
        mobile: 'https://firebasestorage.googleapis.com/v0/b/surajproductions-3f28b.firebasestorage.app/o/AI-Event-Preview-Cover-Photo%2FScreenshot%202025-11-01%20012244%20(1).png?alt=media&token=decb044a-8522-4fb6-8dc8-e931dadd0c18'
      },
      template3: {
        laptop: 'https://firebasestorage.googleapis.com/v0/b/surajproductions-3f28b.firebasestorage.app/o/AI-Event-Preview-Cover-Photo%2FScreenshot%202025-11-01%20012301.png?alt=media&token=963bd57a-8157-4691-b56c-dcf008683456',
        mobile: 'https://firebasestorage.googleapis.com/v0/b/surajproductions-3f28b.firebasestorage.app/o/AI-Event-Preview-Cover-Photo%2FScreenshot%202025-11-01%20012326%20(1).png?alt=media&token=8dba8c17-b24f-40d6-8a85-b0877571e57e'
      }
    };

    return templates[template]?.[device] || '';
  }

  onImageError(event: any) {
    event.target.src = 'https://images.pexels.com/photos/28216688/pexels-photo-28216688.png';
  }

  onEventInput() {
    let value = this.event_config.event_name.replace(/[^a-zA-Z0-9 ]/g, '');
    value = value.trimStart(); // remove leading spaces
    value = value.trimEnd();
    this.event_config.event_name = value;
  }

  togglePhotoQuality(event: any) {
    this.event_config.photo_quality_enabled = event.target.checked;

    if (!event.target.checked) {
      this.event_config.photo_quality = 'basic'; // default fallback
    }
  }

  setPhotoQuality(level: 'basic' | 'standard' | 'high') {
    this.event_config.photo_quality = level;
  }

}
