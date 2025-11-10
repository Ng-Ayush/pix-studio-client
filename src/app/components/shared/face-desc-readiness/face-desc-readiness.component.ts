import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { PhotoSelectionService } from '../../../services/photo-selection.service';
import { AlertService } from '../../../services/alert.service';

@Component({
  selector: 'app-face-desc-readiness',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isProcessing">Processing...</div>
    <div *ngIf="isReady">Ready to AI Share</div>
    <button *ngIf="isReuploadNeeded" class="text-rose-400 font-bold flex gap-2 items-center cursor-pointer" (click)="reUploadFaceDescriptor()">Click To Re-Upload <div class="relative inline-block group">
  <!-- Info Icon -->
  <svg
    xmlns="http://www.w3.org/2000/svg"
    class="w-5 h-5 text-blue-500 cursor-pointer"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M13 16h-1v-4h-1m1-4h.01M12 20.5a8.5 8.5 0 100-17 8.5 8.5 0 000 17z"
    />
  </svg>

  <!-- Tooltip -->
  <div
    class="absolute bottom-full left-1/2 mb-2 hidden w-64 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-lg group-hover:block z-50"
  >
    Your face hasn't been recognized well. Please click on this button to restart the process!
    <div class="absolute left-1/2 top-full -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
  </div>
</div></button>
 <div *ngIf="!isProcessing && !isReady && !isReuploadNeeded"><div role="status">
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
  private intervalId?: any;
  isReuploadNeeded: boolean = false;
  isProcessing: boolean = false;

  constructor(private http: HttpClient, private eventService: PhotoSelectionService,private alert:AlertService) { }

  ngOnInit() {
    this.startStatusCheckProcess();
  }

  startStatusCheckProcess() {
    this.checkReadiness();
    this.intervalId = setInterval(() => {
      if (!this.isReady) {
        this.checkReadiness();
      }
    }, 10000);

  }

  checkReadiness() {
    this.http.get(environment.apiUrl + `/api/mystudio/photo-selection/checkEventReady/${this.event.event_name.split(" ").join("_")}_${this.event.event_id}`)
      .subscribe(
        (res: any) => {
          this.isReady = res.data.status == 'completed';
          this.isReuploadNeeded = res.data.status == 'not_found';
          this.isProcessing = res.data.status == 'processing';
          if (this.isReady) {
            this.eventService.updateFaceDescriptorEvent(this.event.event_id, (res: any) => {
              if (res.status == 200) {
                console.log("Face descriptor value updated");
              }
            })
          }
          if (this.isReady || this.isReuploadNeeded) {
            clearInterval(this.intervalId);
          }
        },
        (err: any) => {
          console.error('Failed to check event readiness', err);
        }
      );
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  reUploadFaceDescriptor() {
    this.eventService.reUploadFaceDescriptor(this.event.event_id, (res: any) => {
      if (res.status == 200) {
        this.startStatusCheckProcess();
        this.alert.info("AI Face Uploading Process is started");
      }else{
        this.alert.error(res.message);
      }
    })

  }
}
