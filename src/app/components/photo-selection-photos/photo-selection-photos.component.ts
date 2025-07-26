import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { PhotoSelectionService } from '../../services/photo-selection.service';
import { getMetadata } from 'firebase/storage';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
import { NgxImageCompressService } from 'ngx-image-compress';
import { LoaderService } from '../../shared/loader.service';

@Component({
  selector: 'app-photo-selection-photos',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, NgOptimizedImage],
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

  uploadedCount = 0;
  totalFiles = 0;
  isUploading = false;
  progressPercentage = 0;
  currentFileName = '';
  batchStart = 1;
  batchEnd = 5;

  sortImagesModal:boolean = false;
  isEventSubmitted:boolean = false;
  originalDirectoryName:any='';
  studio_name:any='';

  constructor(private loader:LoaderService ,private router: Router,private imageCompress: NgxImageCompressService , private _service: CustomerService, private _pservice: PhotoSelectionService, private route: ActivatedRoute) {
    this.route.params.subscribe(params => {
      if (params['folder-id']) {
        this.currentFolderId = params['folder-id'];
        this.getUploadedPhotosByFolderId();
      }
    })
  }

  ngOnInit() {
    let parseData:any  = JSON.parse(<any>localStorage.getItem("userData"));
    this.studio_name = parseData?.studio_name;
    this.user_id = parseData?.id;
  }

  getUploadedPhotosByFolderId() {
    this.loader.show();
    this._pservice.getUploadedPhotosByFolderId(this.currentFolderId, (res: any) => {
      if (res.status == 200) {
        this.photos = res.data.photos;
        this.eventName = res.data.event_name;
        this.customerName = res.data.customer_name;
        this.customerUniqueId = res.data.customer_unique_id;
        this.folderName = res.data.folder_name;
        this.currentEventId = res.data.event_id;
        this.isEventSubmitted = res.data.is_event_submitted;
        setTimeout(() => this.loader.hide(), 500);
      }
    })
  }
  backToEvents() {
    this.router.navigate(['/photo-selection-folder', this.currentEventId]);
  }

  uploadPhotos() {

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

  deletePhotos() {
    this.loader.show();
    const params: any = {
      folder_id: this.currentFolderId,
      photos: this.photos.filter((photo: any) => photo.selected).map((item: any) => ({ url: item.photo_url, id: item.photo_id }))
    }

    this._pservice.deletePhotos(params, (res: any) => {
      if (res.status == 200) {
        this.allSelected = false;
        this.imageSelected = false;
        this.getUploadedPhotosByFolderId();
        this.closeModal();
        this.loader.hide();
      }else{
        this.loader.hide();
      }
    })

  }

  async handleFileInput(event: any) {
    this.loader.show();
    const files: FileList = event.target.files;
    if (files.length === 0) return;

    this.isUploading = true;
    this.uploadedCount = 0;
    this.totalFiles = files.length;

    // Handle uploads in batches (e.g., 5 at a time)
    const batchSize = 5;
    for (let i = 0; i < this.totalFiles; i += batchSize) {
      this.batchStart = i + 1;
      this.batchEnd = Math.min(i + batchSize, this.totalFiles);

      const batchFiles = Array.from(files).slice(i, i + batchSize);
      await Promise.all(
        batchFiles.map((file) =>
          this.compressAndUpload(file).then(() => {
            this.uploadedCount++;
            this.progressPercentage = Math.round((this.uploadedCount / this.totalFiles) * 100);
          })
        )
      );
    }

    this.storeUrlsInDatabase();
    this.isUploading = false;
  }

  async compressAndUpload(file: File): Promise<string> {
    const fileName = file.name;
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.readAsDataURL(file);
      reader.onload = async () => {
        let compressedImage = reader.result as string;
        let blob = this.dataURLtoBlob(compressedImage);

        let quality = this.estimateCompression(blob.size);
        if (blob.size > 100 * 1024) {
          compressedImage = await this.imageCompress.compressFile(
            reader.result as string, -1, quality, quality
          );
          blob = this.dataURLtoBlob(compressedImage);
        }

        const fileRef = ref(this.storage, `photos/studio_${this.studio_name}/${this.customerName}/${this.eventName}/${this.folderName}/${fileName}`);
        const uploadTask = uploadBytesResumable(fileRef, blob);

        uploadTask.then(async () => {
          const url = await getDownloadURL(fileRef);
          const name = await getMetadata(fileRef);
          this.uploadedUrls.push({ url: url, name });

          resolve(url);
        }).catch(reject);
      };
    });
  }

  estimateCompression(fileSize: number): number {
    if (fileSize < 200 * 1024) return 80; // If <200KB, compress at 80%
    if (fileSize < 500 * 1024) return 50; // If <500KB, compress at 50%
    return 30; // If >500KB, compress at 30%
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

  submitImages() {
    console.log(23)
  }

  storeUrlsInDatabase() {
    this.loader.show();
    this._pservice.uploadPhotos({ uploadedUrls: this.uploadedUrls, uploaded_by: this.user_id, folder_id: this.currentFolderId }, (res: any) => {
      if (res.status == 200) {
        this.loader.hide();
        this.progressPercentage = 0;
        this.uploadedUrls = [];
        this.getUploadedPhotosByFolderId();
      }
    })
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
            console.log(matchingImage,"3213123123");
            
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
      alert("Please select a folder first!");
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

      alert("Images sorted successfully!");
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

  toggleDeleteModal(){
    this.deleteModal = true;
  }

  closeModal(){
    this.deleteModal = false;
    this.sortImagesModal = false;
    this.photos.forEach((photo: any) => photo.selected = false);
  }

  toggleSingleDeleteModal(photo:any){
    this.deleteModal = true;
    photo.selected = true;
  }

  getSubmittedSelectedPhotos(){
    console.log(213);
    this.sortImagesModal = true;
  }

}
