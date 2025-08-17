import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { LoaderComponent } from './components/shared/loader/loader.component';
import { SideBarComponent } from './components/shared/side-bar/side-bar.component';
import { UploadImageProgressComponent } from './shared/upload-image-progress/upload-image-progress.component';
import { DeleteImageProcessComponent } from "./shared/delete-image-process/delete-image-process.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoaderComponent, UploadImageProgressComponent, DeleteImageProcessComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'pix-studio-pro';
  isLoggedIn:boolean= false;

  constructor(private auth:AuthService){
    this.isLoggedIn = this.auth.isAuthenticated();
  }
}
