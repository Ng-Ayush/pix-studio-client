import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Storage, ref, uploadBytesResumable, getDownloadURL, uploadBytes } from '@angular/fire/storage';
import { getMetadata } from 'firebase/storage';
import { ImageCompressionService } from './image-compression.service';
import { LoaderService } from '../shared/loader.service';
import { PhotoSelectionService } from './photo-selection.service';
import { AlertService } from './alert.service';
import imageCompression from 'browser-image-compression';
import { environment } from '../../environments/environment';

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
  private concurrency = 60;

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
  photo_quality: any = '';

  filteredEvents: any[] = [];
  // ---------------- Handle File Input ----------------
  async handleAIFileInput(
    event: any,
    eventId: any,
    folderName: any,
    studio_name: any,
    customerName: any,
    eventName: any,
    currentFolderId: any
  ) {
    if (localStorage.getItem("isUploadingGlobally") === "true") {
      this.alert.warning("Another upload is in progress. Please wait until it completes.", 8000);
      return;
    }
    this.totalAiUploadedPhotosCount = JSON.parse(<any>localStorage.getItem("totalAiUploadedPhotosCount")) || 0;

    this.alert.info("Please do not refresh the page until AI upload is completed", 10000);

    const files: File[] = Array.from(event.target.files || []);
    if (!files.length) return;

    const allowedImageTypes = ['image/jpeg', 'image/jpg'];
    const validImageFiles: any[] = [];
    const invalidFiles: any[] = [];

    // ✅ Single loop for filtering
    for (const f of files) {
      if (allowedImageTypes.includes(f.type) && f.size > 0) validImageFiles.push(f);
      else invalidFiles.push(f.name);
    }

    if (invalidFiles.length)
      this.alert.warning(
        `Skipped ${invalidFiles.length} invalid or empty file(s). Only JPG/JPEG images are allowed.`,
        6000
      );

    if (!validImageFiles.length) {
      this.alert.warning("No valid image files selected.", 5000);
      return;
    }

    const existingNameSet = new Set(this.photos.map((p: any) => p.photo_name.toLowerCase()));
    const uniqueFiles: any[] = [];
    for (const f of validImageFiles) {
      if (existingNameSet.has(f.name.toLowerCase()))
        this.alert.warning(`Skipped duplicate: ${f.name}`, 4000);
      else uniqueFiles.push(f);
    }

    if (!this.allowed_photos_quantity) {
      this.allowed_photos_quantity = JSON.parse(<any>localStorage.getItem("userData")).allowed_photos_quantity || 100;
    }

    let limitPhotos = this.allowed_photos_quantity;
    if (this.user_id == 285) limitPhotos = 1000;
    else if (this.user_id == 31) limitPhotos = 50000;

    // ✅ NEW: Get total queued photos across ALL events
    const globalQueuedCount = this.allUploadQueues
      ? this.allUploadQueues.reduce((sum: any, q: any) => sum + q.files.length, 0)
      : this.uploadQueue.reduce((sum, q) => sum + q.files.length, 0);

    // ---------------- QUALITY WEIGHT ----------------
    let weight = 1;
    if (this.photo_quality === "standard") weight = 3;
    else if (this.photo_quality === "high") weight = 10;

    // ---------------- REMAINING WEIGHT ----------------
    const remaining = limitPhotos - this.totalAiUploadedPhotosCount;

    if (remaining <= 0) {
      this.alert.warning(
        `Upload limit of ${limitPhotos} photos reached (uploaded + in queue).`,
        8000
      );
      return;
    }

    // ---------------- MAX FILES ALLOWED BASED ON QUALITY ----------------
    const maxFilesAllowed = Math.floor(remaining / weight);

    if (maxFilesAllowed <= 0) {
      this.alert.warning(
        `No more photos allowed for selected quality.`,
        8000
      );
      return;
    }

    // ---------------- SKIP EXTRA FILES ----------------
    if (uniqueFiles.length > maxFilesAllowed) {
      const skipped = uniqueFiles.length - maxFilesAllowed;
      this.alert.warning(
        `Only ${maxFilesAllowed} more photos allowed. Skipped ${skipped} extra files.`,
        8000
      );
      uniqueFiles.splice(maxFilesAllowed);
    }

    // ---------------- UPDATE COUNTER CORRECTLY ----------------
    // this.totalAiUploadedPhotosCount += uniqueFiles.length * weight;
    // localStorage.setItem(
    //   "totalAiUploadedPhotosCount",
    //   JSON.stringify(this.totalAiUploadedPhotosCount)
    // );

    // ---------------- ADD TO QUEUE ----------------
    if (uniqueFiles.length > 0) {
      this.uploadQueue.push({
        files: uniqueFiles,
        eventId,
        folderName,
        studio_name,
        customerName,
        eventName,
        currentFolderId,
      });

      if (!this.allUploadQueues) this.allUploadQueues = [];
      this.allUploadQueues.push(...this.uploadQueue);
    }

    // ---------------- PROCESS QUEUE ----------------
    if (!this.isProcessingQueue) {
      localStorage.setItem("isUploadingGlobally", "true");
      this.processQueue();
    }
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

      const BATCH_SIZE = 50;
      const COMPRESSION_CONCURRENCY = 6; // Compress 10 images in parallel

      try {
        // Process files in batches for upload
        for (let i = 0; i < this.totalPhotos; i += BATCH_SIZE) {
          const batchFiles = files.slice(i, i + BATCH_SIZE);
          const formData = new FormData();

          const compressedBatch: File[] = [];

          for (let j = 0; j < batchFiles.length; j += COMPRESSION_CONCURRENCY) {
            const chunk = batchFiles.slice(j, j + COMPRESSION_CONCURRENCY);
            const promises = chunk.map(async (file: any) => {
              const compressed :any = this.imageCompressService.compress3MBToTarget(file, this.photo_quality);
              let watermarkedBlob: any;
              if (this.waterMarkConfig?.is_watermark) {
                watermarkedBlob = await this.addWatermarkFromBlob(compressed, this.waterMarkConfig?.transparency);
              }
              return watermarkedBlob ?? compressed;
            }); 

            this.batchStart$.next(i + j + 1);
            this.batchEnd$.next(Math.min(i + j + COMPRESSION_CONCURRENCY, this.totalPhotos));

            const results = await Promise.all(promises);
            compressedBatch.push(...results);
            this.uploadedPhotos += results.length;
            const percent = Math.round((this.uploadedPhotos / this.totalPhotos) * 100);
            this.progressPercentage$.next(percent);
          }

          formData.append('user_id', this.user_id.toString());
          formData.append('studio_name', studio_name);
          formData.append('customer_name', customerName);
          formData.append('customer_id', '28');
          formData.append('event_name', eventName);
          formData.append('event_id', eventId);
          formData.append('folder_name', folderName);
          formData.append('folder_id', currentFolderId.toString());
          formData.append('photo_quality', this.photo_quality);
          formData.append('is_ai_upload', '1');
          compressedBatch.forEach(file => formData.append('files', file, file.name));

          await firstValueFrom(this.http.post<any>(`${environment.apiUrl}/api/mystudio/photos/uploads`, formData));
        }


        // await this.runWithConcurrency(batchFiles, async (file: File) => {
        //   this.currentFileName$.next(file.name);
        //   const url = await this.compressAndUploadAI(file, eventId, studio_name, customerName, eventName, folderName);
        //   this.uploadedPhotos++;
        //   const percent = Math.round((this.uploadedPhotos / this.totalPhotos) * 100);
        //   this.progressPercentage$.next(percent);
        //   currentBatchUrls.push({ url, name: file.name });
        // });

        // await this.saveBatchToBackend(currentBatchUrls, currentFolderId, eventId);
        this.isUploading$.next(false);
      } catch (error: any) {
        console.error(error);
      }

        // await this.saveAllToBackend(currentFolderId, eventId); //

    }

    this.isProcessingQueue = false;
    this.isImageUploadedCompleted$.next(true);
    if (this.uploadQueue.length === 0) {
      localStorage.removeItem("isUploadingGlobally");
      this.getAllEvents();
    }
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
    const compressed: any = await this.imageCompressService.compress3MBToTarget(file, this.photo_quality);
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
          wedding_folder_id: `${this.eventName.split(" ").join("_")}_${this.aiEventId}`,
          photo_quality: this.photo_quality
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
          wedding_folder_id: `${this.eventName.split(" ").join("_")}_${this.aiEventId}`,
          photo_quality: this.photo_quality
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

  getAllEvents() {
    this.loader.show();
    this._pservice.getAllEvents((res: any) => {
      if (res.status == 200) {
        this.filteredEvents = res.data.filter((item: any) => item.is_ai_upload);
        this.getTotalUploadedAiPhotosCount();
      } else {
        console.error(res.message);
      }
    });

  }

  getTotalUploadedAiPhotosCount() {
    this.totalAiUploadedPhotosCount = 0;
    this._pservice.getTotalUploadedAiPhotosCount((res: any) => {
      if (res.status == 200) {
        console.log("Total AI Uploaded Photos Count: ", res.data);
        this.totalAiUploadedPhotosCount = res.data;
        localStorage.setItem('totalAiUploadedPhotosCount', this.totalAiUploadedPhotosCount);
      } else {
        this.alert.error(res.message);
      }
    });
  }

  async compressFile(file: File, options: any): Promise<File> {
    try {
      const compressedBlob = await imageCompression(file, options);
      return new File([compressedBlob], file.name, { type: compressedBlob.type });
    } catch (error) {
      console.warn('Compression failed for', file.name, 'using original.', error);
      return file;
    }
  }
}
