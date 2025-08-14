import { Component, Pipe } from '@angular/core';
import { UploadImgBackgroundService } from '../../services/upload-img-background.service';
import { AsyncPipe, CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-upload-image-progress',
  standalone: true,
  imports: [AsyncPipe,CommonModule,RouterModule],
  templateUrl: './upload-image-progress.component.html',
  styleUrl: './upload-image-progress.component.scss'
})
export class UploadImageProgressComponent {
    constructor(public uploadService: UploadImgBackgroundService) {}
}
