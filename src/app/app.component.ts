import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { LoaderComponent } from './components/shared/loader/loader.component';
import { UploadImageProgressComponent } from './shared/upload-image-progress/upload-image-progress.component';
import { DeleteImageProcessComponent } from "./shared/delete-image-process/delete-image-process.component";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoaderComponent,CommonModule, UploadImageProgressComponent, DeleteImageProcessComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'pix-studio-pro';
  isLoggedIn: boolean = false;
  showLoader: boolean = true;

  constructor(private auth: AuthService) {
    this.isLoggedIn = this.auth.isAuthenticated();
    setTimeout(() => {
      this.showLoader = false;
    }, 1500);
  }
}
