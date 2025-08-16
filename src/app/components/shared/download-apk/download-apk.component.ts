import { CommonModule, } from '@angular/common';
import { Component } from '@angular/core';
import { AlertService } from '../../../services/alert.service';

@Component({
  selector: 'app-download-apk',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './download-apk.component.html',
  styleUrl: './download-apk.component.scss'
})
export class DownloadApkComponent {

  todayYear: any = new Date();
  currentDriveLink:any='https://drive.google.com/file/d/1wKDZm4Bh6tPhGGhOLXwzfHhhFyhm8b81/view';

  previewImages: string[] = [
    'https://firebasestorage.googleapis.com/v0/b/surajproductions-3f28b.firebasestorage.app/o/Download%20Apk%20Images%2Funnamed.webp?alt=media&token=71a5356e-abaa-4b23-905b-1d1f20380aa5',
    'https://firebasestorage.googleapis.com/v0/b/surajproductions-3f28b.firebasestorage.app/o/Download%20Apk%20Images%2Ffolder%20selection.jpg?alt=media&token=8a7e831c-b8be-4e5c-ab87-9f2c6395ea4a',
    'https://firebasestorage.googleapis.com/v0/b/surajproductions-3f28b.firebasestorage.app/o/Download%20Apk%20Images%2Fmehdniiii.jpg?alt=media&token=5264baf2-885f-46aa-aca9-aa1dbb6e898d',
    'https://firebasestorage.googleapis.com/v0/b/surajproductions-3f28b.firebasestorage.app/o/Download%20Apk%20Images%2Fsleection.jpg?alt=media&token=d2d35300-c10c-4d38-abbf-00d42077194e',
    'https://firebasestorage.googleapis.com/v0/b/surajproductions-3f28b.firebasestorage.app/o/Download%20Apk%20Images%2Feven%20done.jpg?alt=media&token=18fe20da-23f1-4707-9f03-db5a1814808a',
  ];

  constructor(private alert:AlertService){}

  // Replace with your actual Google Drive file ID here:
  extractFileId(url: string): string | null {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
    return match ? match[1] : null;
  }

  automaticStartDownload() {
    const fileId = this.extractFileId(this.currentDriveLink);
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    this.currentDriveLink = downloadUrl;
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
      this.alert.error("Error in downloading the file, copy paste the url in new tab")
    }
  }

}
