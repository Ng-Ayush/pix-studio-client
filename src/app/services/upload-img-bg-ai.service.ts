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
    customerId: any,
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
        customerId,
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
  // ✅ OPTIMIZED: Two-phase approach - compress first, then upload
  private async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.uploadQueue.length > 0) {
      const task = this.uploadQueue.shift();
      const { files, eventId, folderName, studio_name, customerName, eventName, currentFolderId, customerId } = task;

      this.totalPhotos = files.length;
      this.uploadedPhotos = 0;

      this.totalPhotos$.next(this.totalPhotos);
      this.progressPercentage$.next(0);
      this.isUploading$.next(true);

      // ✅ TUNED FOR SPEED
      const COMPRESSION_CONCURRENCY = 10; // Compress 10 images in parallel (browsers handle this well)
      const UPLOAD_BATCH_SIZE = 25; // Files per upload request
      const UPLOAD_CONCURRENCY = 4; // 4 parallel upload requests

      try {
        // ═══════════════════════════════════════════════════════
        // PHASE 1: COMPRESS ALL FILES FIRST (with high parallelism)
        // ═══════════════════════════════════════════════════════
        console.log(`[Compress] Starting compression of ${files.length} files...`);
        const compressionStart = Date.now();
        
        const compressedFiles: File[] = [];
        
        for (let i = 0; i < files.length; i += COMPRESSION_CONCURRENCY) {
          const chunk = files.slice(i, i + COMPRESSION_CONCURRENCY);
          
          const promises = chunk.map(async (file: any) => {
            const compressed = await this.compressFile(file, this.photo_quality);
            let result: any = compressed;
            
            if (this.waterMarkConfig?.is_watermark) {
              const watermarked = await this.addWatermarkFromBlob(compressed, this.waterMarkConfig?.transparency);
              if (watermarked) result = watermarked;
            }
            
            return result;
          });

          const results = await Promise.all(promises);
          compressedFiles.push(...results);
          
          // Update compression progress (0-50%)
          const compressPercent = Math.round((compressedFiles.length / this.totalPhotos) * 50);
          this.progressPercentage$.next(compressPercent);
          this.batchStart$.next(compressedFiles.length);
          this.batchEnd$.next(this.totalPhotos);
        }
        
        console.log(`[Compress] All ${compressedFiles.length} files compressed in ${Date.now() - compressionStart}ms`);

        // ═══════════════════════════════════════════════════════
        // PHASE 2: UPLOAD ALL COMPRESSED FILES (parallel batches)
        // ═══════════════════════════════════════════════════════
        console.log(`[Upload] Starting upload of ${compressedFiles.length} compressed files...`);
        const uploadStart = Date.now();
        
        // Split compressed files into upload batches
        const uploadBatches: File[][] = [];
        for (let i = 0; i < compressedFiles.length; i += UPLOAD_BATCH_SIZE) {
          uploadBatches.push(compressedFiles.slice(i, i + UPLOAD_BATCH_SIZE));
        }

        let uploadedCount = 0;

        // Upload batches with parallelism
        for (let batchIdx = 0; batchIdx < uploadBatches.length; batchIdx += UPLOAD_CONCURRENCY) {
          const currentBatches = uploadBatches.slice(batchIdx, batchIdx + UPLOAD_CONCURRENCY);
          
          const uploadPromises = currentBatches.map(async (batch) => {
            const formData = new FormData();
            formData.append('user_id', this.user_id.toString());
            formData.append('studio_name', studio_name);
            formData.append('customer_name', customerName.split(' ').join('_'));
            formData.append('customer_id', customerId.toString());
            formData.append('event_name', eventName);
            formData.append('event_id', eventId);
            formData.append('folder_name', folderName);
            formData.append('folder_id', currentFolderId.toString());
            formData.append('photo_quality', this.photo_quality);
            formData.append('is_ai_upload', '1');
            
            batch.forEach(file => formData.append('files', file, file.name));

            await firstValueFrom(this.http.post<any>(`${environment.apiUrl}/api/mystudio/photos/uploads`, formData));
            return batch.length;
          });

          const results = await Promise.all(uploadPromises);
          uploadedCount += results.reduce((sum, count) => sum + count, 0);
          
          // Update upload progress (50-100%)
          const uploadPercent = 50 + Math.round((uploadedCount / this.totalPhotos) * 50);
          this.progressPercentage$.next(uploadPercent);
          this.uploadedPhotos = uploadedCount;
        }

        console.log(`[Upload] All files uploaded in ${Date.now() - uploadStart}ms`);
        console.log(`[Total] Complete process took ${Date.now() - compressionStart}ms`);

        this.isUploading$.next(false);
      } catch (error: any) {
        console.error('Upload error:', error);
      }
    }

    this.isProcessingQueue = false;
    this.isImageUploadedCompleted$.next(true);
    if (this.uploadQueue.length === 0) {
      localStorage.removeItem("isUploadingGlobally");
      this.getAllEvents();
    }
  }

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

  async compressFile(file: File, quality: any): Promise<File> {
    try {
      // ✅ OPTIMIZATION: Skip compression for already-small files
      const fileSizeMB = file.size / (1024 * 1024);
      
      let maxWidthOrHeight = 1280;
      let maxSizeMB = 1;

      if (quality === 'standard') {
        maxSizeMB = 3;
        maxWidthOrHeight = 1920;
      }

      if (quality === 'high') {
        maxSizeMB = 10;
        maxWidthOrHeight = 4096;
      }

      // Skip compression if file is already smaller than target
      if (fileSizeMB <= maxSizeMB) {
        return file;
      }

      const options = {
        maxSizeMB,
        maxWidthOrHeight,
        useWebWorker: true,
        maxIteration: 2, // ✅ FASTER: Reduced from 5 to 2 iterations
      };
      
      const compressedBlob = await imageCompression(file, options);
      return new File([compressedBlob], file.name, { type: compressedBlob.type });
    } catch (error) {
      console.warn('Compression failed for', file.name, 'using original.', error);
      return file;
    }
  }
}