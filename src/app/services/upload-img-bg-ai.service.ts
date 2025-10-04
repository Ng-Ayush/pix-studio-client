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
export class UploadImgBackgroundAiService {
  storage: any = inject(Storage);

  constructor(
    private http: HttpClient,
    private imageCompressService: ImageCompressionService,
    private loader: LoaderService,
    private _pservice: PhotoSelectionService,
    private alert: AlertService
  ) {}

  // ---------------- Observables ----------------
  isUploading$ = new BehaviorSubject<boolean>(false);
  progressPercentage$ = new BehaviorSubject<number>(0);
  batchStart$ = new BehaviorSubject<number>(0);
  batchEnd$ = new BehaviorSubject<number>(0);
  totalPhotos$ = new BehaviorSubject<number>(0);
  currentFileName$ = new BehaviorSubject<string>('');
  isImageUploadedCompleted$ = new BehaviorSubject<boolean>(false);

  // ---------------- Internal State ----------------
  private totalPhotos = 0;
  private uploadedPhotos = 0;
  private concurrency = 7;

  // ---------------- Variables ----------------
  studio_name: string = '';
  customerName: string = '';
  eventName: string = '';
  folderName: string = '';
  uploadedUrls: any[] = [];
  user_id: number = -1;
  currentFolderId: any = -1;
  photos: any = [];

  private uploadQueue: any[] = [];
  private isProcessingQueue = false;

  // ---------------- Handle File Input ----------------
  handleAIFileInput(
    event: any,
    eventId: any,
    folderName: any,
    studio_name: any,
    customerName: any,
    eventName: any,
    currentFolderId: any
  ) {
    this.alert.info("Please do not refresh the page until AI upload is completed", 10000);

    const files: File[] = Array.from(event.target.files || []);
    if (!files.length) return;

    // Prevent duplicates
    const existingNameSet = new Set(this.photos.map((p: any) => p.photo_name.toLowerCase()));
    const duplicateFiles = files.filter(f => existingNameSet.has(f.name.toLowerCase()));

    if (duplicateFiles.length) {
      duplicateFiles.forEach(f => this.alert.warning(`Skipped duplicate: ${f.name}`, 4000));
    }

    const uniqueFiles = files.filter(f => !existingNameSet.has(f.name.toLowerCase()));

    // ---------------- Enforce 100-photo limit ----------------
    const alreadyUploaded = this.photos.length;
    const queued = this.uploadQueue.reduce((sum, q) => sum + q.files.length, 0);
    const totalUsed = alreadyUploaded + queued;

    const remaining = 100 - totalUsed;
    if (remaining <= 0) {
      this.alert.warning("AI folder already has 100 photos (uploaded + queued).", 8000);
      return;
    }

    if (uniqueFiles.length > remaining) {
      this.alert.warning(`Only ${remaining} more photos allowed.`, 8000);
      uniqueFiles.splice(remaining);
    }

    this.uploadQueue.push({
      files: uniqueFiles,
      eventId,
      folderName,
      studio_name,
      customerName,
      eventName,
      currentFolderId
    });

    if (!this.isProcessingQueue) this.processQueue();
  }

  // ---------------- Queue Processor ----------------
  private async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.uploadQueue.length > 0) {
      const task = this.uploadQueue.shift();
      const { files, eventId, folderName, studio_name, customerName, eventName, currentFolderId } = task;

      this.totalPhotos = files.length;
      this.uploadedPhotos = 0;

      this.totalPhotos$.next(this.totalPhotos);
      this.progressPercentage$.next(0);
      this.isUploading$.next(true);

      const batchSize = 20;

      for (let i = 0; i < this.totalPhotos; i += batchSize) {
        this.batchStart$.next(i + 1);
        this.batchEnd$.next(Math.min(i + batchSize, this.totalPhotos));

        const batchFiles = files.slice(i, i + batchSize);
        const currentBatchUrls: any[] = [];

        await this.runWithConcurrency(batchFiles, async (file: File) => {
          this.currentFileName$.next(file.name);
          const url = await this.compressAndUploadAI(file, eventId, studio_name, customerName, eventName, folderName);
          this.uploadedPhotos++;
          const percent = Math.round((this.uploadedPhotos / this.totalPhotos) * 100);
          this.progressPercentage$.next(percent);
          currentBatchUrls.push({ url, name: file.name });
        });

        await this.saveBatchToBackend(currentBatchUrls, currentFolderId, eventId);
      }

      this.isUploading$.next(false);
    }

    this.isProcessingQueue = false;
    this.isImageUploadedCompleted$.next(true);
  }

  // ---------------- Compress + Upload ----------------
  async compressAndUploadAI(
    file: File,
    eventId: string,
    studio_name: string,
    customerName: string,
    eventName: string,
    folderName: string
  ): Promise<string> {
    const compressed = await this.imageCompressService.compress3MBToTarget(file);
    const path = `ai_photos/studio_${studio_name}/${customerName}/${eventName}/${folderName}/${file.name}`;
    const fileRef = ref(this.storage, path);

    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(fileRef, compressed);
      task.on(
        'state_changed',
        () => {},
        err => reject(err),
        async () => {
          try {
            const url = await getDownloadURL(fileRef);
            const meta = await getMetadata(fileRef);
            this.uploadedUrls.push({ url, name: meta.name });
            resolve(url);
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }

  // ---------------- Concurrency Runner ----------------
  private async runWithConcurrency<T>(
    items: T[],
    worker: (item: T) => Promise<any>,
    concurrency = this.concurrency
  ) {
    return new Promise<void>((resolve) => {
      let idx = 0;
      let finished = 0;
      let active = 0;
      const total = items.length;

      const next = () => {
        if (finished === total) return resolve();
        if (active >= concurrency || idx >= total) return;

        const item = items[idx++];
        active++;

        worker(item)
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

  // ---------------- Backend Save ----------------
  async saveBatchToBackend(batchUrls: { url: string; name: string }[], folderId: any, eventId: any) {
    return new Promise<void>((resolve, reject) => {
      this._pservice.uploadPhotos(
        {
          uploadedUrls: batchUrls,
          uploaded_by: this.user_id,
          event_id: eventId,
          folder_id: folderId,
          is_ai_upload: true
        },
        (res: any) => {
          if (res.status === 200) resolve();
          else reject(res.message);
        }
      );
    });
  }
}
