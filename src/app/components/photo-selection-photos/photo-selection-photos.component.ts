import { CommonModule, LocationStrategy, NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { PhotoSelectionService } from '../../services/photo-selection.service';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
import { NgxImageCompressService } from 'ngx-image-compress';
import { LoaderService } from '../../shared/loader.service';
import { ImageCompressionService } from '../../services/image-compression.service';
import { AlertService } from '../../services/alert.service';
import { UploadImgBackgroundService } from '../../services/upload-img-background.service';
import { DeleteImgBackgroundService } from '../../services/delete-img-background.service';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { UploadImgBackgroundAiService } from '../../services/upload-img-bg-ai.service';

@Component({
  selector: 'app-photo-selection-photos',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, NgOptimizedImage, ScrollingModule],
  templateUrl: './photo-selection-photos.component.html',
  styleUrl: './photo-selection-photos.component.scss'
})
export class PhotoSelectionPhotosComponent {

  todayDate: any = new Date();
  customerName: any = '';
  eventName: any = '';
  folderName: any = '';
  photos: any = [];
  currentFolderId: number = -1;
  currentEventId: number = -1;
  user_id: number = -1;
  customerUniqueId: number = -1;

  allSelected: boolean = false;
  filterMode: "all" | "completed" = "all";
  imageSelected: boolean = false;
  deleteModal: boolean = false;

  selectedFolderHandle: any = null;
  uploadedUrls: any[] = [];
  storage = inject(Storage);

  sortImagesModal: boolean = false;
  isEventSubmitted: boolean = false;
  originalDirectoryName: any = '';
  studio_name: any = '';
  isAIuploaded: boolean = false;
  isLoading: boolean = false;
  userData: any = {};
  showLogOutModal: boolean = false;
  waterMarkConfig:any={};
  constructor(private loader: LoaderService,
    private imageCompressService: ImageCompressionService,
    private location: LocationStrategy,
    private router: Router,
    private _service: CustomerService,
    private _pservice: PhotoSelectionService,
    private route: ActivatedRoute,
    private alert: AlertService,
    private uploadImgBg: UploadImgBackgroundService,
    private aiUploadService: UploadImgBackgroundAiService,
    private deleteImgBg: DeleteImgBackgroundService
  ) {
    this.userData = JSON.parse(<any>localStorage.getItem("userData"));
    this.aiUploadService.allowed_photos_quantity = this.userData?.allowed_photos_quantity;
    uploadImgBg.isAIuploaded = false;
    this.route.params.subscribe(params => {
      if (params['folder-id']) {
        this.currentFolderId = params['folder-id'];
        this.uploadImgBg.currentFolderId = this.currentFolderId;
        this.aiUploadService.currentFolderId = this.currentFolderId;
        this.getUploadedPhotosByFolderId();
      }
    });

    this.route.queryParams.subscribe(params => {
      if (params['ai_uploaded']) {
        this.isAIuploaded = true;
        this.uploadImgBg.isAIuploaded = true;
      }
    });

    this.uploadImgBg.isImageUploadedCompleted$.subscribe((item: any) => {
      if (item) {
        this.getUploadedPhotosByFolderId();
      }
    });
    this.aiUploadService.isImageUploadedCompleted$.subscribe((item: any) => {
      if (item) {
        this.getUploadedPhotosByFolderId();
      }
    });
    this.deleteImgBg.isImagDeletedCompleted$.subscribe((item: any) => {
      if (item) {
        this.closeModal();
        this.allSelected = false;
        this.imageSelected = false;
        this.isLoading = false;
        this.getUploadedPhotosByFolderId();
      }
    })

  }

  ngOnInit() {
    let parseData: any = JSON.parse(<any>localStorage.getItem("userData"));
    this.studio_name = parseData?.studio_name;
    this.user_id = parseData?.id;

    this.uploadImgBg.user_id = this.user_id;
    this.uploadImgBg.studio_name = this.studio_name;

    this.aiUploadService.user_id = this.user_id;
    this.aiUploadService.studio_name = this.studio_name;

    this.aiUploadService.watermarkUrl = this.userData?.studio_icon;

  }

  getUploadedPhotosByFolderId() {
    this.loader.show();
    this._pservice.getUploadedPhotosByFolderId(this.currentFolderId, (res: any) => {
      if (res.status == 200) {
        this.photos = res.data.photos;
        this.uploadImgBg.photos = this.photos;

        this.aiUploadService.photos = this.photos;
        this.eventName = res.data.event_name;
        this.customerName = res.data.customer_name;
        this.folderName = res.data.folder_name;
        this.customerUniqueId = res.data.customer_unique_id;
        this.currentEventId = res.data.event_id;

        this.uploadImgBg.eventName = this.eventName;
        this.uploadImgBg.customerName = this.customerName;
        this.uploadImgBg.folderName = this.folderName;

        this.aiUploadService.eventName = this.eventName;
        this.aiUploadService.customerName = this.customerName;
        this.aiUploadService.folderName = this.folderName;

        this.waterMarkConfig = res.data?.watermark ? JSON.parse(res.data?.watermark) : { is_watermark: false, transparency: null };
        this.aiUploadService.waterMarkConfig = this.waterMarkConfig;

        this.aiUploadService.isFaceDescriptorReady = res.data?.isFaceDescriptorReady;
        this.aiUploadService.aiEventId = res.data?.event_id;

        this.isEventSubmitted = res.data.is_event_submitted;
        setTimeout(() => this.loader.hide(), 500);
      }
    })
  }
  backToEvents() {
    this.location.back();
  }

  toggleSelectAll(): void {
    this.allSelected = !this.allSelected;
    this.photos.forEach((photo: any) => (photo.selected = this.allSelected))
    this.imageSelected = this.photos.some((photo: any) => photo.selected)
  }

  updateSelectAllState(): void {
    this.allSelected = this.photos.every((photo: any) => photo.selected)
    this.imageSelected = this.photos.some((photo: any) => photo.selected)
  }

  setFilter(mode: "all" | "completed"): void {
    this.filterMode = mode;
  }

  get filteredPhotos(): any[] {
    if (this.filterMode === "all") {
      return this.photos;
    } else {
      return this.photos.filter((photo: any) => photo.selected)
    }
  }

  async deletePhotos() {
    this.loader.show();
    this.deleteModal = false;
    const fileredSelectedDeletionPhotos = this.photos.filter((photo: any) => photo.selected).map((item: any) => ({ url: item.photo_url, id: item.photo_id }))
    this.deleteImgBg.enqueueDeletes(this.currentFolderId, fileredSelectedDeletionPhotos);
  }

  getFilePathFromUrl(url: string): string {
    const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/';
    const filePathWithEncodedSpaces = url.split(baseUrl)[1].split('?')[0];
    const decodedPath = decodeURIComponent(filePathWithEncodedSpaces);
    return decodedPath;
  }

  async handleFileInput(event: any) {
    if(!this.isAIuploaded){
      this.uploadImgBg.handleFileInput(event, this.currentEventId, this.folderName, this.studio_name, this.customerName, this.eventName, this.currentFolderId);
    }else{
      this.aiUploadService.handleAIFileInput(event, this.currentEventId, this.folderName, this.studio_name, this.customerName, this.eventName, this.currentFolderId);
    }
  }


  dataURLtoBlob(dataURL: string) {
    const byteString = atob(dataURL.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const intArray = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      intArray[i] = byteString.charCodeAt(i);
    }
    return new Blob([arrayBuffer], { type: mimeString });
  }


  async selectFolder() {
    try {
      // Open folder selection prompt
      this.selectedFolderHandle = await (window as any).showDirectoryPicker();
      this.originalDirectoryName = await this.selectedFolderHandle.name;

      // Attach fileHandle to images in the existing array
      for await (const entry of this.selectedFolderHandle.values()) {
        if (entry.kind === "file" && this.isImage(entry.name)) {
          // Find the matching file in imageArray
          const matchingImage = this.filteredPhotos.find((img: any) => img.photo_name == entry.name);
          if (matchingImage) {
            console.log(matchingImage, "3213123123");

            matchingImage.fileHandle = entry; // Attach file handle to the image
          }
        }
      }
    } catch (error) {
      console.error("Folder selection failed:", error);
    }
  }

  isImage(fileName: string): boolean {
    return /\.(jpg|jpeg|png|gif)$/i.test(fileName);
  }

  async sortImages() {
    if (!this.selectedFolderHandle) {
      this.alert.error("Please select a folder first!");
      return;
    }

    try {
      this.loader.show();
      const selectedFolderHandle = await this.selectedFolderHandle.getDirectoryHandle("Selected", { create: true });
      const favouriteFolderHandle = await this.selectedFolderHandle.getDirectoryHandle("Important", { create: true });

      for (const image of this.filteredPhotos) {
        if (!image.is_selected && !image.is_favourite) continue;

        const sourceFile = await image.fileHandle.getFile();
        const fileBuffer = await sourceFile.arrayBuffer();

        if (image.is_selected) {
          await this.copyFile(selectedFolderHandle, image.photo_name, fileBuffer);
        }

        if (image.is_favourite) {
          await this.copyFile(favouriteFolderHandle, image.photo_name, fileBuffer);
        }
      }

      this.alert.success("Images sorted successfully!");
      this.closeModal();
      this.loader.hide();
    } catch (error) {
      console.error("Sorting failed:", error);
    }
  }

  async copyFile(folderHandle: any, fileName: string, fileBuffer: ArrayBuffer) {
    const newFileHandle = await folderHandle.getFileHandle(fileName, { create: true });
    const writable = await newFileHandle.createWritable();
    await writable.write(fileBuffer);
    await writable.close();
  }

  trackPhotos(index: number, photo: any) {
    return photo.photo_id;
  }

  toggleDeleteModal() {
    this.deleteModal = true;
  }

  closeModal() {
    this.deleteModal = false;
    this.sortImagesModal = false;
    this.photos.forEach((photo: any) => photo.selected = false);
  }

  toggleSingleDeleteModal(photo: any) {
    this.deleteModal = true;
    photo.selected = true;
  }

  getSubmittedSelectedPhotos() {
    console.log(213);
    this.sortImagesModal = true;
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
