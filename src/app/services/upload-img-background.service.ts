import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
import { getMetadata } from 'firebase/storage';
import { ImageCompressionService } from './image-compression.service';
import { LoaderService } from '../shared/loader.service';
import { PhotoSelectionService } from './photo-selection.service';
import { AlertService } from './alert.service';

@Injectable({
  providedIn: 'root'
})
export class UploadImgBackgroundService {

  storage: any = inject(Storage);

  constructor(
    private http: HttpClient,
    private imageCompressService: ImageCompressionService,
    private loader: LoaderService,
    private _pservice: PhotoSelectionService,
    private alert: AlertService
  ) { }

  // ---------------- Observables ----------------
  isUploading$ = new BehaviorSubject<boolean>(false);
  progressPercentage$ = new BehaviorSubject<number>(0);
  batchStart$ = new BehaviorSubject<number>(0);
  batchEnd$ = new BehaviorSubject<number>(0);
  totalPhotos$ = new BehaviorSubject<number>(0);
  currentFileName$ = new BehaviorSubject<string>('');
  isImageUploadedCompleted$ = new BehaviorSubject<boolean>(false);

  // 🔹 Separate subjects for AI uploads
  isAIUploading$ = new BehaviorSubject<boolean>(false);
  progressPercentageAI$ = new BehaviorSubject<number>(0);
  batchStartAI$ = new BehaviorSubject<number>(0);
  batchEndAI$ = new BehaviorSubject<number>(0);
  totalPhotosAI$ = new BehaviorSubject<number>(0);
  currentFileNameAI$ = new BehaviorSubject<string>('');

  // ---------------- State ----------------
  private totalPhotos = 0;
  private uploadedPhotos = 0;
  private concurrency = 7;
  private currentActive = 0;

  // ---------------- Variables ----------------
  isAIuploaded: boolean = false;
  studio_name: any = '';
  customerName: any = '';
  eventName: any = '';
  folderName: any = '';
  uploadedUrls: any[] = [];
  user_id: any = -1;
  currentFolderId: any = -1;
  photos: any = [];


  // ---------------- Queue System ----------------
  private aiUploadQueue: any[] = [];
  private normalUploadQueue: any[] = [];

  private aiUploadingCount = 0;
  private normalUploadingCount = 0;

  isProcessingAI = false;
  isProcessingNormal = false;

  // ---------------- Handle File Input ----------------
  handleFileInput(
    event: any,
    eventId: any,
    folderName: any,
    studio_name: any,
    customerName: any,
    eventName: any,
    currentFolderId: any
  ) {
    this.alert.info("Please do not refresh the page until upload is completed", 10000);
    const files: File[] = Array.from(event.target.files || []);
    if (!files.length) return;

    const existingNameSet = new Set(
      this.photos.map((photo: any) => photo.photo_name.toLowerCase())
    );

    const duplicateFiles: string[] = [];
    let uniqueFiles: File[] = files.filter(file => {
      const fileName = file.name.toLowerCase();
      if (existingNameSet.has(fileName)) {
        duplicateFiles.push(file.name);
        return false;
      }
      return true;
    });

    if (duplicateFiles.length > 0) {
      duplicateFiles.forEach(name => this.alert.warning(`Skipped duplicate file: ${name}`, 5000));
    }

    if (uniqueFiles.length === 0) {
      this.alert.info("No new files to upload.", 5000);
      return;
    }

    // ---------------- AI Upload Limit ----------------
    if (this.isAIuploaded) {
      const alreadyUploaded = this.photos.length;
      const queuedCount = this.aiUploadQueue.reduce((sum, q) => sum + q.files.length, 0);
      const ongoingCount = this.aiUploadingCount;

      const totalUsed = alreadyUploaded + queuedCount + ongoingCount;
      const remainingSlots = 100 - totalUsed;

      if (remainingSlots <= 0) {
        this.alert.warning(`AI folder already has 100 photos (uploaded + in progress).`, 8000);
        return;
      }

      if (uniqueFiles.length > remainingSlots) {
        this.alert.warning(
          `Only ${remainingSlots} more photos can be uploaded. Skipped ${uniqueFiles.length - remainingSlots} photos.`,
          8000
        );
        uniqueFiles = uniqueFiles.slice(0, remainingSlots);
      }

      this.aiUploadQueue.push({ files: uniqueFiles, eventId, folderName, studio_name, customerName, eventName, currentFolderId });
      if (!this.isProcessingAI) this.processQueue(true);
    } else {
      // Normal upload – no limit
      this.normalUploadQueue.push({ files: uniqueFiles, eventId, folderName, studio_name, customerName, eventName, currentFolderId });
      if (!this.isProcessingNormal) this.processQueue(false);
    }

    this.alert.info("Uploading in queue...");
  }

  // ---------------- Queue Processor ----------------
  async processQueue(isAI: boolean) {
    const queue = isAI ? this.aiUploadQueue : this.normalUploadQueue;
    const processingFlag = isAI ? 'isProcessingAI' : 'isProcessingNormal';
    const uploadCounter = isAI ? 'aiUploadingCount' : 'normalUploadingCount';

    // pick proper subjects
    const isUploading$ = isAI ? this.isAIUploading$ : this.isUploading$;
    const progressPercentage$ = isAI ? this.progressPercentageAI$ : this.progressPercentage$;
    const batchStart$ = isAI ? this.batchStartAI$ : this.batchStart$;
    const batchEnd$ = isAI ? this.batchEndAI$ : this.batchEnd$;
    const totalPhotos$ = isAI ? this.totalPhotosAI$ : this.totalPhotos$;
    const currentFileName$ = isAI ? this.currentFileNameAI$ : this.currentFileName$;

    this[processingFlag] = true;

    while (queue.length > 0) {
      const currentTask = queue.shift();
      if (!currentTask) continue;
      this[uploadCounter] = currentTask.files.length;

      const { files, eventId, folderName, studio_name, customerName, eventName, currentFolderId } = currentTask;

      this.totalPhotos = files.length;
      this.uploadedPhotos = 0;

      totalPhotos$.next(this.totalPhotos);
      progressPercentage$.next(0);
      isUploading$.next(true);

      const batchSize = 20;

      for (let i = 0; i < this.totalPhotos; i += batchSize) {
        batchStart$.next(i + 1);
        batchEnd$.next(Math.min(i + batchSize, this.totalPhotos));

        const batchFiles = files.slice(i, i + batchSize);
        const currentBatchUrls: any = [];

        await this.runWithConcurrency(batchFiles, async (file: File) => {
          currentFileName$.next(file.name);
          const url = await this.compressAndUpload(file, eventId, studio_name, customerName, eventName, folderName);
          this.uploadedPhotos++;
          const percent = Math.round((this.uploadedPhotos / this.totalPhotos) * 100);
          progressPercentage$.next(percent);
          currentBatchUrls.push({ url, name: file.name });
        });

        await this.saveBatchToBackend(currentBatchUrls, currentFolderId, eventId);
      }

      isUploading$.next(false);
    }

    this[processingFlag] = false;
  }

  // ---------------- Compress + Upload ----------------
  async compressAndUpload(
    file: File,
    eventId: string,
    studio_name: string,
    customerName: string,
    eventName: string,
    folderName: string
  ): Promise<string> {
    const compressedImage = this.isAIuploaded
      ? await this.imageCompressService.compress3MBToTarget(file)
      : await this.imageCompressService.compress50KBToTarget(file);

    const filePath = `photos/studio_${studio_name}/${customerName}/${eventName}/${folderName}/${file.name}`;
    const fileRef = ref(this.storage, filePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(fileRef, compressedImage);
      uploadTask.on(
        'state_changed',
        () => { },
        (error: any) => reject(error),
        async () => {
          try {
            const url = await getDownloadURL(fileRef);
            const name = await getMetadata(fileRef);
            this.uploadedUrls.push({ url, name: name.name });
            resolve(url);
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }

  // ---------------- Concurrency Handler ----------------
  private async runWithConcurrency<T>(
    items: T[],
    workerFn: (item: T) => Promise<any>,
    concurrency = this.concurrency
  ) {
    return new Promise<void>((resolve) => {
      let idx = 0;
      let finished = 0;
      let active = 0;
      const total = items.length;

      const next = () => {
        if (finished === total) resolve();
        if (active >= concurrency || idx >= total) return;

        const item = items[idx++];
        active++;

        workerFn(item)
          .finally(() => {
            finished++;
            active--;
            next();
          });

        next();
      };

      next();
    });
  }

  // ---------------- Backend Batch Save ----------------
  async saveBatchToBackend(batchUrls: { url: string; name: string }[], folderId: any, eventId: any) {
    return new Promise<void>((resolve, reject) => {
      this._pservice.uploadPhotos(
        {
          uploadedUrls: batchUrls,
          uploaded_by: this.user_id,
          event_id: eventId,
          folder_id: folderId,
          is_ai_upload: this.isAIuploaded
        },
        (res: any) => {
          if (res.status === 200) resolve();
          else reject(res.message);
        }
      );
    });
  }
}
