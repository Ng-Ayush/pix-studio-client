import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-face-desc-readiness',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="!isReady">Processing...</div>
    <div *ngIf="isReady">Ready to AI Share</div>
  `,
  styleUrl: './face-desc-readiness.component.scss'
})
export class FaceDescReadinessComponent {
  @Input() event: any;
  isReady = false;
  private intervalId?: any;
  pollInterval = 10000; // default 10s
  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.checkReadiness();
  }

  checkReadiness() {
    this.http.get(environment.apiUrl + `/api/mystudio/photo-selection/checkEventReady/${this.event.event_name.split(" ").join("_")}_${this.event.event_id}`)
      .subscribe(
        (res: any) => {
          const data = res.data;
          const { total_images, processed_images, status } = data;

          this.isReady = status === 'completed';

          if (this.isReady) {
            clearInterval(this.intervalId);
            return;
          }

          // Updated benchmark: 100 photos ≈ 32.5s → 0.325s per photo
          const estimatedProcessingSpeed = 0.325; // seconds per image
          const remainingImages = total_images - processed_images;
          const estimatedRemainingTime = remainingImages * estimatedProcessingSpeed * 1000; // in ms

          // Adjust next interval dynamically
          this.pollInterval = Math.min(Math.max(estimatedRemainingTime / 5, 10000), 60000);

          console.log(`✅ Progress: ${processed_images}/${total_images}`);
          console.log(`Next check in ${Math.round(this.pollInterval / 1000)} seconds...`);

          clearInterval(this.intervalId);
          this.intervalId = setInterval(() => {
            if (!this.isReady) {
              this.checkReadiness();
            }
          }, this.pollInterval);
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
