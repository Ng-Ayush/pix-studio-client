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
  dekstopUrl: any = 'https://drive.google.com/file/d/1PzMyTJXP8ucb98mnZOp7c489DQ-cwKZ5/view?usp=sharing';

  goToLogin() {
    this.router.navigate(['/login']);
  }

  downloadDesktopApp() {
    const fileId = this.extractFileId(this.dekstopUrl);
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    try {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = '';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, 300);
    }
    catch (error: any) {
      this.alert.error("Error in downloading the application")
    }
  }

  extractFileId(url: string): string | null {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
    return match ? match[1] : null;
  }
}
