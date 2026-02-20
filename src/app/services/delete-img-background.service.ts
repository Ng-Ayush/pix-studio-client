import { inject, Injectable } from '@angular/core';
import { Storage, ref, deleteObject } from '@angular/fire/storage';
import { BehaviorSubject, Subject } from 'rxjs';
import { PhotoSelectionService } from './photo-selection.service';
import { AlertService } from './alert.service';
import { LoaderService } from '../shared/loader.service';
@Injectable({
  providedIn: 'root'
})
export class DeleteImgBackgroundService {

  private deleteQueue: any[] = [];
  private isProcessingDeleteQueue = false;
  isDeleting$ = new BehaviorSubject<boolean>(false);
  deleteProgressPercentage$ = new BehaviorSubject<number>(0);
  batchStart$ = new BehaviorSubject<number>(0);
  batchEnd$ = new BehaviorSubject<number>(0);
  totalPhotos$ = new BehaviorSubject<number>(0);
  totalPhotos = 0;
  deletedPhotos = 0;
  storage: any = inject(Storage);
  isImagDeletedCompleted$ = new BehaviorSubject<boolean>(false);

  constructor(private _pservice: PhotoSelectionService, private alert: AlertService, private loader: LoaderService) { }


  enqueueDeletes(folderId: any, photos: any[]) {
    this.deleteQueue.push({ folderId, photos });
    if (!this.isProcessingDeleteQueue) {
      this.processDeleteQueue();
    }
  }


  async processDeleteQueue() {
    this.isProcessingDeleteQueue = true;

    while (this.deleteQueue.length > 0) {
      const currentTask = this.deleteQueue.shift();
      if (!currentTask) continue;

      const { photos, folderId } = currentTask;
      if (!photos.length) return;

      this.totalPhotos = photos.length;
      this.deletedPhotos = 0;

      this.totalPhotos$.next(this.totalPhotos);
      this.deleteProgressPercentage$.next(0);
      this.isDeleting$.next(true);

      // decide batch size based on number of files
      const batchSize = this.getBatchSize(this.totalPhotos);

      for (let i = 0; i < this.totalPhotos; i += batchSize) {
        this.batchStart$.next(i + 1);
        this.batchEnd$.next(Math.min(i + batchSize, this.totalPhotos));

        const batchFiles = photos.slice(i, i + batchSize);

        await Promise.all(
          batchFiles.map(async (photo: any) => {
            if (!photo.url) return;
            try {
              // await deleteObject(fileRef);
              this.deletedPhotos++;
              const percent = Math.round((this.deletedPhotos / this.totalPhotos) * 100);
              this.deleteProgressPercentage$.next(percent);

            } catch (error) {
              console.error(`Error deleting ${photo.url}:`, error);
            }
          })
        );
      }

      // optional: cleanup DB entries after batch delete
      await this.deleteFromDatabase(folderId, photos);

      this.isDeleting$.next(false);
      this.isImagDeletedCompleted$.next(true);
    }

    this.isProcessingDeleteQueue = false;
  }

  async deleteFromDatabase(folderId: any, photos: any[]) {
    try {
      const batchSize = 70;
      const total = photos.length;
      for (let i = 0; i < total; i += batchSize) {
        const batch = photos.slice(i, i + batchSize);

        await new Promise<void>((resolve, reject) => {
          this._pservice.deletePhotos({ folder_id: folderId, photos: batch }, (res: any) => {
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
      this.alert.success("All photos deleted successfully!");
    } catch (err) {
      this.alert.error("Error saving photos: " + err);
    }
  }


  private getBatchSize(total: number): number {
    if (total < 100) return 50;
    if (total <= 500) return 100;
    if (total <= 1000) return 300;
    if (total <= 5000) return 500;
    return 1000;
  }
}
