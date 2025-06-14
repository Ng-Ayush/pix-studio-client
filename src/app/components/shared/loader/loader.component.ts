import { Component } from '@angular/core';
import { LoaderService } from '../../../shared/loader.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.scss'
})
export class LoaderComponent {
  isLoading = false;

  constructor(private loader: LoaderService) {
    this.loader.loading$.subscribe((state) => {
      this.isLoading = state;
    });
  }
}
