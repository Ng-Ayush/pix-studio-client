import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { interval } from 'rxjs';
import { CustomerService } from '../../services/customer.service';
import { PhotoSelectionService } from '../../services/photo-selection.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-photo-selection',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './photo-selection.component.html',
  styleUrl: './photo-selection.component.scss'
})
export class PhotoSelectionComponent {

  todayDate = new Date();
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
  userData: any = {};

  constructor(private service: CustomerService, private eventService: PhotoSelectionService, private router: Router, private alert: AlertService) {
    this.userData = JSON.parse(<any>localStorage.getItem("userData"));
    console.log(this.userData);

  }

  ngOnInit() {
    this.getAllEvents();
    this.getAllCustomers();
  }

  getAllEvents() {
    this.eventService.getAllEvents((res: any) => {
      if (res.status == 200) {
        this.eventList = res.data.filter((item: any) => !item.is_ai_upload);
        this.filteredEvents = [...this.eventList];
      }
    })
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
        is_ai_upload: !!this.event_config.is_ai_upload,
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
    this.router.navigate(['/photo-selection-folder', id]);
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


  copyMessage(event: any) {
    const message = `Dear ${event.customer_name},\nYour event ${event.event_name} is ready for photo selection. Your event code is ${event.customer_unique_id} and you can select photos from\n\nWebsite : ${window.location.origin}/selection/auth-screen?studio-id=${this.userData.id}\n\nRegards ${this.userData?.studio_name}`
    navigator.clipboard.writeText(message).then(() => {
      this.alert.success('Message copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy message: ', err);
    });
  }

  copyCustomerCode(event: any) {
    const message = event.customer_unique_id;
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
}


