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
  @Input() eventId!: number;
  isReady = false;
  private intervalId?: any;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.checkReadiness();

    // Poll every 10 seconds
    this.intervalId = setInterval(() => {
      if (!this.isReady) {
        this.checkReadiness();
      }
    }, 5000);
  }

  checkReadiness() {
    this.http.get(environment.apiUrl+`/api/mystudio/photo-selection/checkEventReady/${this.eventId}`)
      .subscribe(
        (res:any) => {
          // this.isReady = res.isFaceDescriptorReady != 0 && res.isFaceDescriptorReady != '0' && res.isFaceDescriptorReady != 'false';
          this.isReady = res.isFaceDescriptorReady;
          console.log("GOT VALUE HERE isFaceDescriptorReady",res.isFaceDescriptorReady);
          
          if (this.isReady) {
            clearInterval(this.intervalId);
          }
        },
        (err:any) => {
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
