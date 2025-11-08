import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-face-desc-readiness',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isProcessing">Processing...</div>
    <div *ngIf="isReady">Ready to AI Share</div>
    <div *ngIf="isReuploadNeeded" class="text-rose-500 font-bold flex gap-2 items-center">Re-Upload Needed <div class="relative inline-block group">
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
    Your face hasn't been recognized well. Please delete the photos and re-upload!
    <div class="absolute left-1/2 top-full -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
  </div>
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

  constructor(private http: HttpClient) { }

  ngOnInit() {
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
          // this.isReady = res.isFaceDescriptorReady != 0 && res.isFaceDescriptorReady != '0' && res.isFaceDescriptorReady != 'false';
          this.isReady = res.data.status == 'completed';
          this.isReuploadNeeded = res.data.status == 'not_found';
          this.isProcessing = res.data.status == 'processing';
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
}
