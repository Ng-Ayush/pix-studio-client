import { Component } from '@angular/core';
import { PhotoSelectionService } from '../../services/photo-selection.service';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoaderService } from '../../shared/loader.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-image-listing-screen',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NgOptimizedImage],
  templateUrl: './image-listing-screen.component.html',
  styleUrl: './image-listing-screen.component.scss'
})
export class ImageListingScreenComponent {

  folderId: any = '';
  folderName: any = '';
  customerName = '';
  eventName = '';
  selectedPhotosCount = 0;
  photos: any = [];
  customerUniqueCode: any = '';
  event_id: any = '';
  userData: any = {};
  showModal: boolean = false;
  showImageModal: boolean = false;
  currentImage:any={};

  constructor(private pservice: PhotoSelectionService,
     private router: Router,
       private alert: AlertService,
         private loader:LoaderService
    ) {
    this.userData = JSON.parse(<any>localStorage.getItem("userData"));
  }

  ngOnInit() {
    this.folderId = localStorage.getItem("folderId");
    if (this.folderId) {
      this.getUploadedPhotosByFolderId();
    }
  }

  getUploadedPhotosByFolderId() {
    this.pservice.getUploadedPhotosByFolderId(this.folderId, (res: any) => {
      if (res.status == 200) {
        console.log(res);
        this.photos = res.data.photos;
        this.eventName = res.data.event_name;
        this.customerName = res.data.customer_name;
        this.customerUniqueCode = res.data.customer_unique_id;
        this.event_id = res.data.event_id;
        this.selectedPhotosCount = res.data.selectedPhotosCount;
        this.folderName = res.data.folder_name;
      }
    })

  }

  toggleSelect(image: any): void {
    image.is_selected = !image.is_selected;
    if (!image.is_selected) {
      image.is_favourite = false;
    }

    const params: any = {
      photo_id: image.photo_id,
      is_favourite: !!image.is_favourite,
      is_selected: !!image.is_selected,
      folder_id: this.folderId,
    }

    this.pservice.updatePhotoStatus(params, (res: any) => {
      if (res.status == 200) {
        // this.getUploadedPhotosByFolderId();
        this.selectedPhotosCount = this.photos.filter((item: any) => item.is_selected).length;

      }
    })
  }

  toggleFavorite(image: any): void {
    image.is_favourite = !image.is_favourite;
    if (image.is_favourite) {
      image.is_selected = true;
    }

    const params: any = {
      photo_id: image.photo_id,
      is_favourite: !!image.is_favourite,
      is_selected: !!image.is_selected,
      folder_id: this.folderId,
    }

    this.pservice.updatePhotoStatus(params, (res: any) => {
      if (res.status == 200) {
        // this.getUploadedPhotosByFolderId();
        console.log(res);

      }
    })
  }

  trackPhotos(index: number, photo: any) {
    return photo.id;
  }

  backToFolderListing() {
    this.router.navigate(['/selection/folder-listing-screen']);
  }

  showEventModal() {
    this.showModal = true;
  }

  submitEvent() {
    this.loader.show();
    this.pservice.submitEvent({ event_id: this.event_id }, (res: any) => {
      if (res.status == 200) {
        this.showModal = false;
        this.alert.success(res.message);
        this.loader.hide();
        this.router.navigate(['/login']);
      } else {
        this.loader.hide();
        this.alert.error(res.message);
      }
    })
  }

  onCancel() {
    this.showModal = false;
    this.showImageModal=false;
  }

  viewImage(image:any) {
    console.log(image);
    
    this.currentImage = image;
    this.showImageModal = true;
  }
}
