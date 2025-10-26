import { ChangeDetectorRef, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { PhotoSelectionService } from '../../services/photo-selection.service';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoaderService } from '../../shared/loader.service';
import { AlertService } from '../../services/alert.service';
import { ScrollingModule } from '@angular/cdk/scrolling';
import {
  trigger,
  transition,
  style,
  animate,
  state,
} from '@angular/animations';

@Component({
  selector: 'app-image-listing-screen',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NgOptimizedImage, ScrollingModule],
  templateUrl: './image-listing-screen.component.html',
  styleUrl: './image-listing-screen.component.scss',
  animations: [
    // Overlay fade in/out
    trigger('fadeAnimation', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms ease-in', style({ opacity: 1 }))]),
      transition(':leave', [animate('200ms ease-out', style({ opacity: 0 }))]),
    ]),

    // Modal zoom in/out
    trigger('zoomAnimation', [
      transition(':enter', [
        style({ transform: 'scale(0.9)', opacity: 0 }),
        animate('200ms ease-out', style({ transform: 'scale(1)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ transform: 'scale(0.9)', opacity: 0 })),
      ]),
    ]),

    // Image fade transition on change
    trigger('imageFade', [
      transition('* => *', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 })),
      ]),
    ]),
  ],
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
  currentImage: any = {};
  currentIndex: number = 0;
  imageLoading: boolean = false;
  currentImageSrc: string = '';

  zoomLevel: number = 1;
  minZoom: number = 1;
  maxZoom: number = 3;
  translateX: number = 0;
  translateY: number = 0;
  isDragging: boolean = false;
  lastMouseX: number = 0;
  lastMouseY: number = 0;

  constructor(private pservice: PhotoSelectionService,
    private router: Router,
    private alert: AlertService,
    private loader: LoaderService,
    private cdRef: ChangeDetectorRef
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
    this.showImageModal = false;
    this.removeOutsideClickListener();
  }

  viewImage(idx: any) {
    this.currentIndex = idx;
    this.currentImageSrc = this.photos[this.currentIndex].photo_url;
    this.showImageModal = true;
    this.resetZoom();
  }

  addOutsideClickListener() {
    setTimeout(() => {
      document.addEventListener('click', this.outsideClickHandler);
    }, 100);
  }

  removeOutsideClickListener() {
    setTimeout(() => {
      document.removeEventListener('click', this.outsideClickHandler);
    }, 100);
  }

  outsideClickHandler = (event: MouseEvent) => {
    const modalContent: HTMLElement | null = document.getElementById('modalContainer');
    if (!modalContent) return;

    // Check if click target is outside the modal container
    if (!modalContent.contains(event.target as Node)) {
      this.showImageModal = false;
      this.removeOutsideClickListener();
    }
  };


  ngAfterViewInit() {
    // this.addOutsideClickListener();
  }

  openModal(index: number) {
    this.currentIndex = index;
    this.showImageModal = true;
    this.resetZoom();
  }

  closeModal() {
    this.showImageModal = false;
  }

  nextImage(event?: MouseEvent) {
    event?.stopPropagation();
    this.resetZoom();
    this.currentIndex = (this.currentIndex + 1) % this.photos.length;
    this.imageLoading = true;
    this.currentImageSrc = this.photos[this.currentIndex].photo_url;
    setTimeout(() => {
      this.imageLoading = false;
    }, 500);
  }

  previousImage(event?: MouseEvent) {
    event?.stopPropagation();
    this.resetZoom();
    this.currentIndex = (this.currentIndex - 1 + this.photos.length) % this.photos.length;
    this.imageLoading = true;
    this.currentImageSrc = this.photos[this.currentIndex].photo_url;
    setTimeout(() => {
      this.imageLoading = false;
    }, 500);
  }

  zoomIn() {
    if (this.zoomLevel < this.maxZoom) {
      this.zoomLevel += 0.25;
    }
  }

  zoomOut() {
    if (this.zoomLevel > this.minZoom) {
      this.zoomLevel -= 0.25;
      if (this.zoomLevel <= 1) {
        this.translateX = 0;
        this.translateY = 0;
      }
    }
  }

  startDragging(event: MouseEvent) {
    if (this.zoomLevel <= 1) return;
    this.isDragging = true;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  onDragging(event: MouseEvent) {
    if (!this.isDragging) return;
    const dx = event.clientX - this.lastMouseX;
    const dy = event.clientY - this.lastMouseY;
    this.translateX += dx / this.zoomLevel;
    this.translateY += dy / this.zoomLevel;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  stopDragging() {
    this.isDragging = false;
  }

  resetZoom() {
    this.zoomLevel = 1;
    this.translateX = 0;
    this.translateY = 0;
  }


}


