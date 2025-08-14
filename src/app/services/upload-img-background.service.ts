import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
import { deleteObject, getMetadata } from 'firebase/storage';
import { ImageCompressionService } from './image-compression.service';
import { LoaderService } from '../shared/loader.service';
import { PhotoSelectionService } from './photo-selection.service';
import { AlertService } from './alert.service';
@Injectable({
  providedIn: 'root'
})
export class UploadImgBackgroundService {

  storage: any = inject(Storage);

  constructor(private http: HttpClient,
    private imageCompressService: ImageCompressionService,
    private loader: LoaderService,
    private _pservice: PhotoSelectionService,
    private alert: AlertService
  ) { }

  isUploading$ = new BehaviorSubject<boolean>(false);
  progressPercentage$ = new BehaviorSubject<number>(0);
  batchStart$ = new BehaviorSubject<number>(0);
  batchEnd$ = new BehaviorSubject<number>(0);
  totalPhotos$ = new BehaviorSubject<number>(0);

  private totalPhotos = 0;
  private uploadedPhotos = 0;

  isAIuploaded: boolean = false;
  studio_name: any = '';
  customerName: any = '';
  eventName: any = '';
  folderName: any = '';
  uploadedUrls: any = [];
  user_id: any = -1;
  currentFolderId: any = -1;

  uploadQueue: any[] = [];
  isProcessingQueue = false;

  handleFileInput(event: any, eventId: any, folderName: any, studio_name: any, customerName: any, eventName: any, currentFolderId: any) {
    const files: File[] = Array.from(event.target.files || []);
    if (!files.length) return;

    // Push into queue
    this.uploadQueue.push({ files, eventId, folderName, studio_name, customerName, eventName, currentFolderId });
    this.alert.info("Uploading In Queue");
    // Start queue if not already running
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }


  async processQueue() {
    this.isProcessingQueue = true;

    while (this.uploadQueue.length > 0) {
      const currentTask = this.uploadQueue.shift();
      if (!currentTask) continue;
      const { files, eventId, studioName, customerName, eventName, folderName, currentFolderId } = currentTask;

      if (!files.length) return;

      this.totalPhotos = files.length;
      this.uploadedPhotos = 0;

      this.totalPhotos$.next(this.totalPhotos);
      this.progressPercentage$.next(0);
      this.isUploading$.next(true);

      const batchSize = 5;
      for (let i = 0; i < this.totalPhotos; i += batchSize) {
        this.batchStart$.next(i + 1);
        this.batchEnd$.next(Math.min(i + batchSize, this.totalPhotos));

        const batchFiles = files.slice(i, i + batchSize);

        await Promise.all(
          batchFiles.map((file: any) =>
            this.compressAndUpload(file, eventId, studioName, customerName, eventName, folderName).then(() => {
              this.uploadedPhotos++;
              const percent = Math.round((this.uploadedPhotos / this.totalPhotos) * 100);
              this.progressPercentage$.next(percent);
            })
          )
        );
      }

      await this.storeUrlsInDatabase(currentFolderId);
      this.isUploading$.next(false);
    }
    this.isProcessingQueue = false;
  }

  async compressAndUpload(file: File, eventId: string, studio_name: string, customerName: string, eventName: string, folderName: string,): Promise<string> {
    const fileName = file.name;
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.readAsDataURL(file);
      reader.onload = async () => {
        let compressedImage: any = reader.result as string;
        compressedImage = this.isAIuploaded ? await this.imageCompressService.compress3MBToTarget(file) : await this.imageCompressService.compress50KBToTarget(file);
        const fileRef = ref(this.storage, `photos/studio_${studio_name}/${customerName}/${eventName}/${folderName}/${fileName}`);
        const uploadTask = uploadBytesResumable(fileRef, compressedImage);

        uploadTask.then(async () => {
          const url = await getDownloadURL(fileRef);
          const name = await getMetadata(fileRef);
          this.uploadedUrls.push({ url: url, name });

          resolve(url);
        }).catch(reject);
      };
    });
  }

  async storeUrlsInDatabase(currentFolderId: any) {
    this.loader.show();
    this._pservice.uploadPhotos({ uploadedUrls: this.uploadedUrls, uploaded_by: this.user_id, folder_id: currentFolderId }, (res: any) => {
      if (res.status == 200) {
        this.loader.hide();
        this.alert.success(res.message);
        this.uploadedUrls = [];
      } else {
        this.loader.hide();
        this.alert.error(res.message);
      }
    })
  }
}
