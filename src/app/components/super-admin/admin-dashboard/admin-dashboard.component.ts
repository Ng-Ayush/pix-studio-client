import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FileService } from '../../../services/file.service';
import { interval } from 'rxjs';
import { Router } from '@angular/router';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
import { AlertService } from '../../../services/alert.service';
import { AdminService } from '../../../services/admin.service';
import { ImageCompressionService } from '../../../services/image-compression.service';


@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent {
  stats: any;
  todayDate: any = new Date();
  showModal: boolean = false;
  images: (string | null)[] = [null, null, null]; // 3 slots for images
  storage = inject(Storage);

  constructor(
    private fileService: FileService,
    private router: Router,
    private alert: AlertService,
    private adminService: AdminService,
    private imageCompressService: ImageCompressionService
  ) { }

  ngOnInit() {
    this.loadDynamicIamgeUrl();
  }

  loadDynamicIamgeUrl() {
    this.adminService.getDynamicImageUrl((res: any) => {
      if (res.status == 200) {
        this.images = res.data;
      }

    })
  }


  logout() {
    this.router.navigate(['admin/login']);
  }

  openDynamicLinkModal() {
    this.showModal = true;
  }


  onFileSelected(event: Event, index: number) {
    const fileInput: any = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files[0]) {
      console.log(fileInput.files);

      const reader = new FileReader();
      reader.onload = async () => {
        const compressedImage = await this.imageCompressService.compress50KBToTarget(fileInput.files[0]);
        const fileRef = ref(this.storage, `dynamic_image_url/${fileInput.files[0].name}`);
        const uploadTask = uploadBytesResumable(fileRef, compressedImage);
        uploadTask.then(async () => {
          const url = await getDownloadURL(fileRef);
          console.log(url);
          this.images[index] = url;
        })
      };
      reader.readAsDataURL(fileInput.files[0]);
    }
  }

  triggerFileInput(index: number) {
    const fileInput = document.getElementById(`fileInput${index}`) as HTMLInputElement;
    fileInput.click();
  }

  dataURLtoBlob(dataURL: string) {
    const byteString = atob(dataURL.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const intArray = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      intArray[i] = byteString.charCodeAt(i);
    }
    return new Blob([arrayBuffer], { type: mimeString });
  }

  uploadDynamicImages() {
    this.adminService.insertImages({ images: this.images }, (res: any) => {
      if (res.status == 200) {
        this.alert.success(res.message);
        this.showModal = false;
        this.loadDynamicIamgeUrl();
      }
    })
  }

  trackByIndex(index: number) {
    return index;
  }
}
