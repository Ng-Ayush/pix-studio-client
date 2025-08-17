import { Component } from '@angular/core';
import { DeleteImgBackgroundService } from '../../services/delete-img-background.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-delete-image-process',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delete-image-process.component.html',
  styleUrl: './delete-image-process.component.scss'
})
export class DeleteImageProcessComponent {

  constructor(public deleteService: DeleteImgBackgroundService) { }
}
