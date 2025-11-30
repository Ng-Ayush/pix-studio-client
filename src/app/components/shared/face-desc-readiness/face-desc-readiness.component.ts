import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { PhotoSelectionService } from '../../../services/photo-selection.service';
import { AlertService } from '../../../services/alert.service';
import { UploadImgBackgroundAiService } from '../../../services/upload-img-bg-ai.service';

@Component({
  selector: 'app-face-desc-readiness',
  standalone: true,
  imports: [CommonModule],
  template: `
   <button 
  *ngIf="isStartProcess"
  class="text-indigo-600 font-bold flex gap-2 items-center cursor-pointer"
  (click)="startFaceDescriptorProcess()"
>
  Start Face Processing
</button>

<div *ngIf="isProcessing">Processing...</div>

<div *ngIf="isReady">Ready to AI Share</div>
<div *ngIf="!isProcessing && !isReady && !isStartProcess">
  <div role="status">
    <svg aria-hidden="true" class="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
    </svg>
    <span class="sr-only">Loading...</span>
</div></div>
    
  `,
  styleUrl: './face-desc-readiness.component.scss'
})
export class FaceDescReadinessComponent {
  @Input() event: any;

  isReady = false;
  isProcessing = false;
  isStartProcess = false;   // replaces old isReuploadNeeded
  private intervalId?: any;

  constructor(private http: HttpClient, private eventService: PhotoSelectionService, private alert: AlertService, private aiService: UploadImgBackgroundAiService) { }

  ngOnInit() {
    this.startStatusCheckProcess();
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  /** -------------------------
   *  NEW METHOD NAME
   * ------------------------- */
  startFaceDescriptorProcess() {
    this.eventService.reUploadFaceDescriptor(this.event.event_id, (res: any) => {
      if (res.status === 200) {
        localStorage.setItem(`face_process_${this.event.event_id}`, 'started');
        this.alert.info("AI Face Uploading Process is started");
        this.isStartProcess = false; // hide button until you want to show it again
        this.isReady = false;
        this.isProcessing = true;
        this.startStatusCheckProcess();
      } else {
        this.alert.error(res.message);
      }
    });
  }

  startStatusCheckProcess() {
    this.checkReadiness();
    this.intervalId = setInterval(() => {
      if (!this.isReady) {
        this.checkReadiness();
      }
    }, 10000);
  }

  /** Your original logic – untouched */
  checkReadiness() {

    const key = `face_process_${this.event.event_id}`;
    const userStarted = localStorage.getItem(key) === 'started';

    const url = `${environment.apiUrl}/api/mystudio/photo-selection/checkEventReady/${this.event.event_name.split(' ').join('_')}_${this.event.event_id}`;

    this.http.get(url).subscribe(
      (res: any) => {
        const status = res?.data?.status;

        // COMPLETED / PARTIAL
        if (status === 'completed' || status === 'partial') {
          this.isReady = true;
          this.isProcessing = false;
          this.isStartProcess = false;

          localStorage.removeItem(key);

          this.eventService.updateFaceDescriptorEvent(this.event.event_id, () =>
            console.log("Face descriptor updated")
          );

          clearInterval(this.intervalId);
          return;
        }

        // PROCESSING
        if (status === 'processing') {
          this.isProcessing = true;
          this.isStartProcess = false;
          this.isReady = false;
          return;
        }

        // NOT FOUND → Folder not created yet
        if (status === 'not_found') {

          if (userStarted) {
            // 🔥 User clicked Start so folder delay is expected
            this.isProcessing = true;
            this.isStartProcess = false;
            this.isReady = false;
            return;
          }

          // 🔥 User never started the process manually
          this.isStartProcess = true;
          this.isProcessing = false;
          this.isReady = false;
        }
      },
      (err) => {
        const status = err?.error?.status;
        const userStarted = localStorage.getItem(key) === 'started';

        if (status === 'not_found') {
          if (userStarted) {
            // Still processing because user clicked
            this.isProcessing = true;
            this.isStartProcess = false;
            this.isReady = false;
            return;
          } else {
            // No process ever started
            this.isStartProcess = true;
            this.isProcessing = false;
            this.isReady = false;
            clearInterval(this.intervalId);
            return;
          }
        }

        console.error('Failed to check event readiness', err);
        this.isStartProcess = true;
        this.isProcessing = false;
        this.isReady = false;
        clearInterval(this.intervalId);
        return;
      }
    );
  }

}
