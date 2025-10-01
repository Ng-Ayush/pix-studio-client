import { CommonModule, LocationStrategy, NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { PhotoSelectionService } from '../../services/photo-selection.service';
import { AlertService } from '../../services/alert.service';
import { Storage, ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll } from '@angular/fire/storage';

@Component({
  selector: 'app-photo-selection-folder',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './photo-selection-folder.component.html',
  styleUrl: './photo-selection-folder.component.scss'
})
export class PhotoSelectionFolderComponent {

  todayDate: any = new Date();
  folders: any[] = [];
  showModal = false;
  newFolderName = '';
  currentEventId: number = -1;
  isEdit: boolean = false;
  currentFolderId: number = -1;
  deleteModal: boolean = false;
  eventName: any = '';
  aiGuests: any = [];
  isAIuploaded: boolean = false;
  deleteConfig: any = {};
  storage = inject(Storage);
  userData: any = {};
  customerName: any = '';
  showLogOutModal: boolean = false;

  constructor(private service: CustomerService, private location: LocationStrategy, private _pservice: PhotoSelectionService, private route: ActivatedRoute, private router: Router, private alert: AlertService) {
    this.route.params.subscribe(params => {
      if (params['event-id']) {
        this.currentEventId = params['event-id'];
        this.fetchFolderByEventId();
        // this.fetchAiGuestByEventId();
      }
    })
    this.route.queryParams.subscribe(params => {
      if (params['ai_uploaded']) {
        this.isAIuploaded = true;
      }
    });

    this.userData = JSON.parse(<any>localStorage.getItem("userData"));
  }

  fetchFolderByEventId() {
    this._pservice.getFolderByEventId(this.currentEventId, (res: any) => {
      if (res.status == 200) {
        this.folders = res.data;
        this.eventName = res.data[0]?.event_name || '';
        this.customerName = res.data[0]?.customer_name || '';
      }
    })
  }

  fetchAiGuestByEventId() {
    this._pservice.getAiGuestByEventId(this.currentEventId, (res: any) => {
      if (res.status == 200) {
        this.aiGuests = res.data;
      }
    })
  }


  toggleFolderSelection(folder: any): void {
    folder.selected = !folder.selected;
  }

  openCreateFolderModal(): void {
    this.newFolderName = '';
    this.showModal = true;
  }

  openEditFolderModal(folder: any): void {
    this.newFolderName = folder.folder_name;
    this.showModal = true;
    this.isEdit = true;
    this.currentFolderId = folder.id;
  }

  createNewFolder() {
    if(this.isAIuploaded && this.folders.length > 0 ) {
        this.alert.info("Please upgrade your plan to create more folders",3000);
        return;
    }
    
    const params: any = {
      folder_name: `New Folder ${this.folders.length + 1}`,
      event_id: this.currentEventId
    }

    this._pservice.createNewFolder(params, (res: any) => {
      if (res.status == 200) {
        this.alert.success("Folder Created");
        this.fetchFolderByEventId();
      } else {
        this.alert.error(res.message);
      }
    })

  }

  closeModal(): void {
    this.showModal = false;
    this.isEdit = false;
    this.deleteModal = false;
  }

  editFolder() {
    const params: any = {
      folder_name: this.newFolderName,
      event_id: this.currentEventId,
    }

    this._pservice.updateFolder(params, this.currentFolderId, (res: any) => {
      if (res.status == 200) {
        this.alert.success("Folder Updated");
        this.closeModal();
        this.fetchFolderByEventId();
      } else {
        this.alert.error(res.message);
      }
    })
  }

  toggleDeleteModal(folder: any) {
    this.deleteModal = true;
    this.currentFolderId = folder.id;
    this.deleteConfig = folder;
  }

  async deleteFolder() {

    // if (this.deleteConfig?.photo_url) {   this will be continued
    //   const folderPath = this.getFolderPathFromUrl(this.deleteConfig.photo_url);
    //   const folderRef = ref(this.storage, folderPath);
    //   const items = await listAll(folderRef);

    //   console.log("items",items);
      

    //   const deletePromises = items.items.map(item => deleteObject(item));
    //   await Promise.all(deletePromises);
    // }

    this._pservice.deleteFolder(this.currentFolderId, (res: any) => {
      if (res.status == 200) {
        this.alert.success("Folder Deleted");
        this.closeModal();
        this.fetchFolderByEventId();
      } else {
        this.alert.error(res.message);
      }
    })
  }

  getFolderPathFromUrl(url: any) {
    const matched = url.match(/\/o\/(.*?)\?/);
  if (!matched || matched.length < 2) return '';

  const fullPath = decodeURIComponent(matched[1]); // Decode %2F etc.
  const parts = fullPath.split('/');

  // Remove only the filename
  parts.pop();

  
  return parts.join('/');
  }


  backToEvents() {
    this.location.back();
    // this.router.navigate(['/photo-selection']);
  }

  openFolder(folder: any) {
    this.router.navigate(['/photo-selection-photos', folder.id], this.isAIuploaded ? ({ queryParams: { ai_uploaded: true } }) : ({}));

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
