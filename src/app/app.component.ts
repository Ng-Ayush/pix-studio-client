import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { LoaderComponent } from './components/shared/loader/loader.component';
import { UploadImageProgressComponent } from './shared/upload-image-progress/upload-image-progress.component';
import { DeleteImageProcessComponent } from "./shared/delete-image-process/delete-image-process.component";
import { CommonModule } from '@angular/common';
import { UploadImageProgressAiComponent } from './shared/upload-image-progress-ai/upload-image-progress-ai.component';
declare var window: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoaderComponent, CommonModule, UploadImageProgressComponent, DeleteImageProcessComponent,UploadImageProgressAiComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'pix-studio-pro';
  isLoggedIn: boolean = false;
  showLoader: boolean = true;
  hasDesktopUpdated: boolean = false;
  progress = 0;
  interval: any = '';
  constructor(private auth: AuthService) {
    this.isLoggedIn = this.auth.isAuthenticated();
    setTimeout(() => {
      this.showLoader = false;
    }, 1500);
    localStorage.setItem('isUploadingGlobally', 'false');
  }

  updateDesktopApp() {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.updateApp();
      this.hasDesktopUpdated=false;
    }
  }

  updateProgress() {
    const progressBar:any = document.getElementById('progressBar');

    this.interval = setInterval(() => {
      if (this.progress < 100) {
        this.progress += 1;
        progressBar.style.width = this.progress + '%';
        progressBar.textContent = this.progress + '%';
      } else {
        clearInterval(this.interval);
        this.updateDesktopApp();
      }
    }, 50); // 50ms per percent = ~5 seconds total
  }
}
