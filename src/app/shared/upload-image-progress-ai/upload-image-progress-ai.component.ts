import { Component } from '@angular/core';
import { UploadImgBackgroundAiService } from '../../services/upload-img-bg-ai.service';
import { RouterModule } from '@angular/router';
import { AsyncPipe, CommonModule } from '@angular/common';

@Component({
  selector: 'app-upload-image-progress-ai',
  standalone: true,
  imports: [AsyncPipe,CommonModule,RouterModule],
  templateUrl: './upload-image-progress-ai.component.html',
  styleUrl: './upload-image-progress-ai.component.scss'
})
export class UploadImageProgressAiComponent {
  constructor(public uploadService: UploadImgBackgroundAiService) {}
}
