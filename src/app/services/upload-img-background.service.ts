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
  photos: any = [];
  isImageUploadedCompleted$: any = new BehaviorSubject<boolean>(false);
  // concurrency control
  private concurrency = 7; // tune this (5-10 recommended)
  private currentActive = 0;
  currentFileName$ = new BehaviorSubject<string>('');

  handleFileInput(event: any, eventId: any, folderName: any, studio_name: any, customerName: any, eventName: any, currentFolderId: any) {
    const files: File[] = Array.from(event.target.files || []);
    if (!files.length) return;

    const existingNameSet = new Set(
      this.photos.map((photo: any) => photo.photo_name.toLowerCase())
    );

    const duplicateFiles: string[] = [];
    const uniqueFiles = files.filter(file => {
      const fileName = file.name.toLowerCase();
      if (existingNameSet.has(fileName)) {
        duplicateFiles.push(file.name);
        return false;
      }
      return true;
    });

    if (duplicateFiles.length > 0) {
      for (let i = 0; i < duplicateFiles.length; i++) {
        this.alert.warning(`Skipped duplicate files: ${duplicateFiles[i]}`, 5000);
      }
    }

    if (uniqueFiles.length === 0) {
      this.alert.info("No new files to upload.", 5000);
      return;
    }

    // Push into queue
    this.uploadQueue.push({ files: uniqueFiles, eventId, folderName, studio_name, customerName, eventName, currentFolderId });
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
      const { files, eventId, folderName, studio_name, customerName, eventName, currentFolderId } = currentTask;

      if (!files.length) return;

      this.totalPhotos = files.length;
      this.uploadedPhotos = 0;

      this.totalPhotos$.next(this.totalPhotos);
      this.progressPercentage$.next(0);
      this.isUploading$.next(true);

      // const batchSize = this.getBatchSize(this.totalPhotos);
      const batchSize = 20;
      for (let i = 0; i < this.totalPhotos; i += batchSize) {
        this.batchStart$.next(i + 1);
        this.batchEnd$.next(Math.min(i + batchSize, this.totalPhotos));

        const batchFiles = files.slice(i, i + batchSize);

        await this.runWithConcurrency(batchFiles, async (file: File) => {
          this.currentFileName$.next(file.name);
          const url = await this.compressAndUpload(file, eventId, studio_name, customerName, eventName, folderName); // adapt folderName param
          this.uploadedPhotos++;
          const percent = Math.round((this.uploadedPhotos / this.totalPhotos) * 100);
          this.progressPercentage$.next(percent);

        });

        // await Promise.all(
        //   batchFiles.map((file: any) =>
        //     this.compressAndUpload(file, eventId, studio_name, customerName, eventName, folderName).then(() => {
        //       this.uploadedPhotos++;
        //       const percent = Math.round((this.uploadedPhotos / this.totalPhotos) * 100);
        //       this.progressPercentage$.next(percent);
        //     })
        //   )
        // );
      }

      await this.storeUrlsInDatabase(currentFolderId);
      this.isUploading$.next(false);
      this.isImageUploadedCompleted$.next(true);
    }
    this.isProcessingQueue = false;
  }

  private async runWithConcurrency<T>(items: T[], workerFn: (item: T) => Promise<any>) {
    return new Promise<void>((resolve, reject) => {
      let idx = 0;
      let finished = 0;
      const total = items.length;
      const tryNext = async () => {
        if (finished === total) return resolve();
        if (this.currentActive >= this.concurrency) return;
        if (idx >= total) return;

        const current = items[idx++];
        this.currentActive++;
        workerFn(current)
          .then(() => {
            finished++;
          })
          .catch(err => {
            // decide whether to reject or continue on per-file failure
            console.error('upload error for item', err);
            finished++;
            // you may choose to collect failed items and retry
          })
          .finally(() => {
            this.currentActive--;
            // start next immediately
            if (finished === total) return resolve();
            setTimeout(tryNext, 0);
          });

        // start more while capacity available
        if (this.currentActive < this.concurrency && idx < total) {
          tryNext();
        }
      };

      // kick off initial workers
      const startCount = Math.min(this.concurrency, total);
      for (let i = 0; i < startCount; i++) tryNext();
    });
  }


  async compressAndUpload(file: File, eventId: string, studio_name: string, customerName: string, eventName: string, folderName: string,): Promise<string> {
    const fileName = file.name;
    const reader = new FileReader();

    const compressedImage = this.isAIuploaded ? await this.imageCompressService.compress3MBToTarget(file) : await this.imageCompressService.compress50KBToTarget(file);

    const filePath = `photos/studio_${studio_name}/${customerName}/${eventName}/${folderName}/${file.name}`;
    const fileRef = ref(this.storage, filePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(fileRef, compressedImage);

      // listen for per-file progress & states
      uploadTask.on('state_changed',
        (snapshot: any) => {
          const bytesTransferred = snapshot.bytesTransferred;
          const totalBytes = snapshot.totalBytes;
          const filePercent = Math.round((bytesTransferred / totalBytes) * 100);
        },
        (error: any) => {
          console.error('Upload failed for', file.name, error);
          reject(error);
        },
        async () => {
          try {
            const url = await getDownloadURL(fileRef);
            const name = await getMetadata(fileRef);
            this.uploadedUrls.push({ url: url, name: name.name });
            resolve(url);
          } catch (err) {
            reject(err);
          }
        }
      );
    });

    // return new Promise((resolve, reject) => {
    //   reader.readAsDataURL(file);
    //   reader.onload = async () => {
    //     let compressedImage: any = reader.result as string;
    //     compressedImage = this.isAIuploaded ? await this.imageCompressService.compress3MBToTarget(file) : await this.imageCompressService.compress50KBToTarget(file);
    //     const fileRef = ref(this.storage, `photos/studio_${studio_name}/${customerName}/${eventName}/${folderName}/${fileName}`);
    //     const uploadTask = uploadBytesResumable(fileRef, compressedImage);

    //     uploadTask.then(async () => {
    //       const url = await getDownloadURL(fileRef);
    //       const name = await getMetadata(fileRef);
    //       this.uploadedUrls.push({ url: url, name: name.name });

    //       resolve(url);
    //     }).catch(reject);
    //   };
    // });
  }

  getBatchSize(fileCount: number): number {
    if (fileCount < 100) return 50;
    if (fileCount <= 500) return 100;
    if (fileCount <= 1000) return 300;
    if (fileCount <= 5000) return 500;
    return 1000; // fallback for very large sets
  }

  async storeUrlsInDatabase(currentFolderId: any) {
    this.loader.show();
    try {
      const batchSize = 70;
      const total = this.uploadedUrls.length;

      for (let i = 0; i < total; i += batchSize) {
        const batch = this.uploadedUrls.slice(i, i + batchSize);

        await new Promise<void>((resolve, reject) => {
          this._pservice.uploadPhotos(
            {
              uploadedUrls: batch,
              uploaded_by: this.user_id,
              folder_id: currentFolderId
            },
            (res: any) => {
              if (res.status == 200) {
                resolve();
              } else {
                reject(res.message);
              }
            }
          );
        });
      }

      this.loader.hide();
      this.alert.success("All photos saved successfully!");
      this.uploadedUrls = [];
    } catch (err) {
      this.loader.hide();
      this.alert.error("Error saving photos: " + err);
    }
  }
}
