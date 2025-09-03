import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent {

  router: any = inject(Router);
  constructor(private alert: AlertService) { }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  downloadDesktopApp() {
    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/surajproductions-3f28b.firebasestorage.app/o/default%20assets%2FMy%20Studio%20Desktop%20Setup%201.0.0.exe?alt=media&token=62bd1eb9-a550-4c25-81ce-fdcc7b9475b9`;
    try {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.target = '_blank';
        a.setAttribute('download', '');
        a.click();
      }, 300);
    } catch (error: any) {
      this.alert.error("Error in downloading the application");
    }
  }

  extractFileId(url: string): string | null {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
    return match ? match[1] : null;
  }
}
