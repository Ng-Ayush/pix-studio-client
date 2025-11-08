import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Storage, ref, uploadBytesResumable, getDownloadURL, uploadBytes } from '@angular/fire/storage';
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
  totalAiUploadedPhotosCount: any = 0;

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

  // ---------------- Internal State ----------------
  private totalPhotos = 0;
  private uploadedPhotos = 0;
  private concurrency = 50;

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

  watermarkUrl: any = '';
  waterMarkConfig: any = {};
  isFaceDescriptorReady: any = null;
  aiEventId: any = null;

  allowed_photos_quantity: any = 0;
  allUploadQueues: any = [];
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
    this.totalAiUploadedPhotosCount = JSON.parse(<any>localStorage.getItem("totalAiUploadedPhotosCount")) || 0;

    this.alert.info("Please do not refresh the page until AI upload is completed", 10000);

    const files: File[] = Array.from(event.target.files || []);
    if (!files.length) return;

    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/heic', 'image/heif'];
    const imageFiles = files.filter(f => allowedImageTypes.includes(f.type));

    // 🔥 Optional: Warn if user selected invalid files
    const invalidFiles = files.filter(f => !allowedImageTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      this.alert.warning(
        `Skipped ${invalidFiles.length} invalid file(s). Only image formats (JPG, PNG, WEBP, HEIC) are allowed.`,
        8000
      );
    }

    if (!imageFiles.length) {
      this.alert.warning("No valid image files selected.", 5000);
      return;
    }

    const existingNameSet = new Set(this.photos.map((p: any) => p.photo_name.toLowerCase()));
    const duplicateFiles = imageFiles.filter(f => existingNameSet.has(f.name.toLowerCase()));
    if (duplicateFiles.length) {
      duplicateFiles.forEach(f => this.alert.warning(`Skipped duplicate: ${f.name}`, 4000));
    }

    const uniqueFiles = imageFiles.filter(f => !existingNameSet.has(f.name.toLowerCase()));

    if (!this.allowed_photos_quantity) {
      this.allowed_photos_quantity = JSON.parse(<any>localStorage.getItem("userData")).allowed_photos_quantity || 100;
    }

    let limitPhotos = this.allowed_photos_quantity;
    if (this.user_id == 285) limitPhotos = 1000;
    else if (this.user_id == 31) limitPhotos = 50000;
    // else if(this.user_id == 429) limitPhotos = 40000;

    // ✅ NEW: Get total queued photos across ALL events
    const globalQueuedCount = this.allUploadQueues
      ? this.allUploadQueues.reduce((sum: any, q: any) => sum + q.files.length, 0)
      : this.uploadQueue.reduce((sum, q) => sum + q.files.length, 0);

    // ✅ NEW: totalUsed is now global (uploaded + all queued)
    const totalUsed = this.totalAiUploadedPhotosCount + globalQueuedCount;

    const remaining = limitPhotos - totalUsed;

    if (remaining <= 0) {
      this.alert.warning(`Upload limit of ${limitPhotos} photos reached (uploaded + in queue).`, 8000);
      return;
    }

    if (uniqueFiles.length > remaining) {
      const skipped = uniqueFiles.length - remaining;
      this.alert.warning(`Only ${remaining} more photos allowed. Skipped ${skipped} extra files.`, 8000);
      uniqueFiles.splice(remaining);
    }

    if (uniqueFiles.length > 0) {
      this.uploadQueue.push({
        files: uniqueFiles,
        eventId,
        folderName,
        studio_name,
        customerName,
        eventName,
        currentFolderId
      });

      // ✅ NEW: maintain global reference to all queues
      if (!this.allUploadQueues) this.allUploadQueues = [];
      this.allUploadQueues.push(...this.uploadQueue);
    }

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

      const batchSize = 100;

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

        // await this.saveBatchToBackend(currentBatchUrls, currentFolderId, eventId);
      }

      await this.saveAllToBackend(currentFolderId, eventId); //

      this.isUploading$.next(false);
    }

    this.isProcessingQueue = false;
    this.isImageUploadedCompleted$.next(true);
    this._pservice.getTotalUploadedAiPhotosCount((res: any) => {
      this.totalAiUploadedPhotosCount = res.data;
      localStorage.setItem("totalAiUploadedPhotosCount", JSON.stringify(this.totalAiUploadedPhotosCount));
    });
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
    const compressed: any = await this.imageCompressService.compress3MBToTarget(file);
    let watermarkedBlob: any;
    if (this.waterMarkConfig?.is_watermark) {
      watermarkedBlob = await this.addWatermarkFromBlob(compressed, this.waterMarkConfig?.transparency);
    }
    const path = `ai_photos/studio_${studio_name}/${customerName}/${eventName}/${folderName}/${file.name}`;
    const fileRef = ref(this.storage, path);

    try {
      // ⛔️ Use non-resumable upload for faster performance
      await uploadBytes(fileRef, watermarkedBlob ?? compressed);

      // Get the download URL
      const url = await getDownloadURL(fileRef);
      const name = await getMetadata(fileRef);

      // Track uploaded file
      this.uploadedUrls.push({ url, name: name.name });

      return url;
    } catch (error) {
      throw error;
    }
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
          folder_id: +folderId,
          is_ai_upload: true,
          wedding_folder_id: `${this.eventName.split(" ").join("_")}_${this.aiEventId}`
        },
        (res: any) => {
          if (res.status === 200) resolve();
          else reject(res.message);
        }
      );
    });
  }

  async addWatermarkFromBlob(blob: Blob, transparencyValue: any): Promise<Blob | null> {
    return new Promise(async (resolve) => {
      const originalImage = await this.blobToImage(blob);
      const watermarkImage = new Image();
      watermarkImage.crossOrigin = 'anonymous';
      watermarkImage.src = this.watermarkUrl;

      watermarkImage.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = originalImage.width;
        canvas.height = originalImage.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);

        // Draw original image
        ctx.drawImage(originalImage, 0, 0);

        const baseScale = 0.1;
        let watermarkWidth = originalImage.width * baseScale;
        let watermarkHeight = (watermarkWidth / watermarkImage.width) * watermarkImage.height;

        // Clamp watermark size
        watermarkWidth = Math.max(50, Math.min(watermarkWidth, 90));
        watermarkHeight = Math.max(50, Math.min(watermarkHeight, 90));

        const x = originalImage.width - watermarkWidth - 10;
        const y = originalImage.height - watermarkHeight - 10;

        ctx.globalAlpha = transparencyValue || 0.8; // Default to 0.8 if not provided
        ctx.drawImage(watermarkImage, x, y, watermarkWidth, watermarkHeight);

        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.95);
      };

      watermarkImage.onerror = () => resolve(null);
    });
  }

  private blobToImage(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      img.onload = () => resolve(img);
      img.onerror = err => reject(err);
    });
  }

  async saveAllToBackend(folderId: any, eventId: any) {
    if (!this.uploadedUrls.length) return;

    return new Promise<void>((resolve, reject) => {
      this._pservice.uploadPhotos(
        {
          uploadedUrls: this.uploadedUrls,  // send all at once
          uploaded_by: this.user_id,
          event_id: eventId,
          folder_id: +folderId,
          is_ai_upload: true,
          wedding_folder_id: `${this.eventName.split(" ").join("_")}_${this.aiEventId}`
        },
        (res: any) => {
          if (res.status === 200) {
            this.alert.success("All photos uploaded successfully!", 5000);

            // ✅ Clear after successful upload
            this.uploadedUrls = [];
            resolve();
          } else {
            reject(res.message);
          }
        }
      );
    });
  }

}
