import { Component } from '@angular/core';
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
declare var Razorpay: any;
@Component({
  selector: 'app-ai-photo-sharing',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './ai-photo-sharing.component.html',
  styleUrl: './ai-photo-sharing.component.scss'
})
export class AiPhotoSharingComponent {

  todayDate: any = new Date();
  customers: any = [];

  photoSharingEnabled = false;
  photoQualities = ['Basic', 'Standard', 'High'];
  selectedQuality = 'Basic';
  isModalOpen: boolean = false;
  event_config: any = {};
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
  constructor(
    private alert: AlertService,
    private router: Router,
    private eventService: PhotoSelectionService,
    private service: CustomerService,
    // private faceService: FaceRecognitionService,
    private loader: LoaderService,
    private customerService: CustomerService,
    private _adminService: AdminService

  ) {
    this.userData = JSON.parse(<any>localStorage.getItem("userData"));
  }

  ngOnInit() {
    this.getAllEvents();
    this.getAllCustomers();
    // this
  }


  getAllEvents() {
    this.loader.show();
    this.eventService.getAllEvents((res: any) => {
      if (res.status == 200) {
        this.eventList = res.data.filter((item: any) => item.is_ai_upload);
        this.filteredEvents = [...this.eventList];
        this.loader.hide();
      } else {
        this.alert.error(res.message);
        this.loader.hide();
      }
    });

  }

  getAllCustomers() {
    this.service.getAllCustomers((res: any) => {
      if (res.status == 200) {
        this.customers = res.data.filter((item: any) => item.is_ai_customer);
        this.filteredCustomer = [...this.customers];
      }
    })
  }


  onCancel() {
    this.isModalOpen = false;
    this.isEdit = false;
    this.deleteModal = false;
  }

  openPriceModal() {
    this.showPaymentModal = true;
  }

  onSave() {
    if (!this.isEdit) {

      const params: any = {
        customer_id: this.event_config.customer_id,
        event_name: this.event_config.event_name,
        is_event_submitted: false,
        is_ai_upload: true,
        quality: this.event_config.quality,
        plan_data: this.planConfig,
        razorpay_payment_id: this.event_config.payment_data.razorpay_payment_id,
        razorpay_order_id: this.event_config.payment_data.razorpay_order_id,
        razorpay_signature: this.event_config.payment_data.razorpay_signature
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
      }

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
  }

  selectQuality(quality: string) {
    this.selectedQuality = quality;
    this.event_config.quality = this.selectedQuality;
  }

  editModal(event: any) {
    this.isEdit = true;
    this.isModalOpen = true;
    this.event_config = event;
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
    console.log(event);

    const message = event.customer_unique_id;
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
      this.filteredEvents = this.eventList.filter((item: any) => item.event_name.toLowerCase().includes(event.target.value.toLowerCase()));
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

    const url = `${window.location.origin}/login`;
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
        .toLowerCase().includes(query)
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
          let data = { razorpay_payment_id: response.razorpay_payment_id, razorpay_order_id: response.razorpay_order_id, razorpay_signature: response.razorpay_signature }
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
}
