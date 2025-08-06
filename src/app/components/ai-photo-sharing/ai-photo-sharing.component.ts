import { Component } from '@angular/core';
import { AlertService } from '../../services/alert.service';
import { AdminService } from '../../services/admin.service';
import { PhotoSelectionService } from '../../services/photo-selection.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { interval } from 'rxjs';
import { CustomerService } from '../../services/customer.service';
import * as QRCode from 'qrcode';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';
import * as faceapi from 'face-api.js';
import { FaceRecognitionService } from '../../services/face-recognition.service';
import { LoaderService } from '../../shared/loader.service';
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

  constructor(
    private alert: AlertService,
    private router: Router,
    private eventService: PhotoSelectionService,
    private service: CustomerService,
    private faceService: FaceRecognitionService,
    private loader: LoaderService,
    private customerService: CustomerService,

  ) { }

  ngOnInit() {
    this.getAllEvents();
    this.getAllCustomers();
    // this
  }

  getAllEvents() {
    this.eventService.getAllEvents((res: any) => {
      if (res.status == 200) {
        this.eventList = res.data.filter((item: any) => item.is_ai_upload);
        this.filteredEvents = [...this.eventList];
        if (this.eventList.length > 0) {
          this.eventList.forEach((eve: any) => {
            this.eventService.getAllPhotosByEventId(eve.event_id, (res: any) => {
              if (res.status == 200) {
                eve.photos = res.data;
              }
            })
          })
        }
      }
      console.log(this.eventList);
    });

  }

  getAllCustomers() {
    this.service.getAllCustomers((res: any) => {
      if (res.status == 200) {
        this.customers = res.data;
      }
    })
  }


  onCancel() {
    this.isModalOpen = false;
    this.isEdit = false;
    this.deleteModal = false;
  }

  onSave() {
    if (!this.isEdit) {

      const params: any = {
        customer_id: this.event_config.customer_id,
        event_name: this.event_config.event_name,
        is_event_submitted: false,
        is_ai_upload: true,
        quality: this.event_config.quality
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

    const message = `${window.location.origin}/ps/?event-id=${event.event_id}`
    navigator.clipboard.writeText(message).then(() => {
      this.alert.success('Message copied to clipboard');
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

  downloadQR(event: any) {
    const url = `${window.location.origin}/ps/?event-id=${event.event_id}`;

    QRCode.toDataURL(url)
      .then(qrDataUrl => {
        const a = document.createElement('a');
        a.href = qrDataUrl;
        a.download = 'mystudio-qr.png';
        document.body.appendChild(a); // Required for Firefox
        a.click();
        document.body.removeChild(a);
      })
      .catch(err => {
        console.error('QR Code generation failed', err);
      });
  }

  publishAiPhotos(event: any) {
    if (event.ai_guests.length == 0) return;
    console.log(event);
    const data: any = this.faceService.filterPhotosByFaceMatch(event.ai_guests[0].image_url, event.photos)
    console.log(data);
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
  }

  closeModal() {
    this.isEdit = false;
    this.partyModal = false;
  }

  saveParty() {
    this.loader.show();
    if (!this.customerConfig.name || !this.customerConfig.phone) {
      this.loader.hide();
      this.alert.error('Please fill all the fields');
      return;
    }
    const params:any= { ...this.customerConfig,is_ai_customer: true };
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
}
