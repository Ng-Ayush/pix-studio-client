import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AlertService } from '../../services/alert.service';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent {

  router: any = inject(Router);
  homePageConfig: any = { home: true };
  contactForm: any = {};
  googleDriveLinks: any = [
    { url: "https://drive.google.com/file/d/15CyosG4HPeEnAWCOSNbSUqKsqECJlzYF/view?usp=sharing", title: "Behind the Scenes - Studio Workflow", desc: " Go behind the scenes as we showcase how My Studio keeps you organized and inspired. Practical tips for boosting productivity." },
    {
      url: "https://drive.google.com/file/d/1r4FRu1j_KzbCmW7tI5rTSov4_GIsCd5m/view?usp=sharing", title: "New Features Launch - August 2025", desc: "See new workflow, improved reminders, and privacy tools in action. See live demonstrations and user feedback."
    },
    {
      url: "https://drive.google.com/file/d/1gWm9WfDt7WyaRTNRDn5TKs4wPqB1_1B7/view?usp=sharing", title: "Community Spotlight - Photographers' Stories", desc: " Meet talented photographers as they share their creative journeys and how My Studio helps them create."
    },
    { url: "https://drive.google.com/file/d/1DHUSCYKPwzDwbDFXUoqwXckzkNsFg4_A/view?usp=sharing", title: "Upcoming Features Preview", desc: "Get a sneak peek at upcoming features and improvements coming soon to My Studio." }
  ];
  directVideoLinks: any = [];

  constructor(private alert: AlertService, private sanitizer: DomSanitizer) {

  }

  ngOnInit() {
    this.directVideoLinks = this.googleDriveLinks.map((link: any) => {
      const match = link.url.match(/\/d\/([^/]+)\//);
      let directUrl = '';
      if (match && match[1]) {
        directUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
      }
      // Sanitize the URL
      return {
        ...link,
        safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(directUrl)
      };
    });
    console.log(this.directVideoLinks);

  }

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

  handleSubmit() {
    if (!this.contactForm.name || !this.contactForm.email || !this.contactForm.message) {
      this.alert.error("Please fill all the fields.");
      return;
    }
    this.contactForm = {};
    this.alert.success("Submitted successfully!, We will contact you soon.");
  }
}
