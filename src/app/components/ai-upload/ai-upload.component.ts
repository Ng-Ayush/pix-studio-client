import { Component, ViewChild, ElementRef, inject, HostListener, ViewEncapsulation } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
import { LoaderService } from '../../shared/loader.service';
import { PhotoSelectionService } from '../../services/photo-selection.service';
import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../services/auth.service';
import * as faceapi from 'face-api.js';
import { environment } from '../../../environments/environment';
import { UniqueFolderIdPipe } from '../../shared/unique-folder-id.pipe';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TemplateThreeComponent } from '../../shared/ai-cover/template-three/template-three.component';
import { TemplateTwoComponent } from '../../shared/ai-cover/template-two/template-two.component';
import { YouTubePlayerModule } from '@angular/youtube-player';
@Component({
  selector: 'app-ai-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, TemplateTwoComponent, TemplateThreeComponent, YouTubePlayerModule],
  templateUrl: './ai-upload.component.html',
  styleUrls: ["./ai-upload.component.scss", "../../../assets/css/style.css", "../../../assets/css/bootstrap.min.css"],
  encapsulation: ViewEncapsulation.None
})
export class AiUploadComponent {
  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  activeTab: any = 'browse';

  videoStream: MediaStream | null = null;
  matchedImages: any[] = [];

  ai_upload_user: any = { phone: 0, name: '', otp: 0 }
  isOTPSent: boolean = false;
  otpcode: number = 0;
  isOtpVerified: boolean = false;
  eventId: any = '';
  isImageCaptured: boolean = false;
  capturedGuestImage: any = {};
  aiGuestConfig: any = {};
  userData: any = {};
  isFormValid: boolean = false;

  isBrowseAllFolder: boolean = false;
  imageSelected: boolean = false;
  photos: any = [];
  isAllSelected: boolean = false;
  isLoading: boolean = false;
  videoModal: boolean = false;

  isReady = false;
  intervalId?: any;
  previewCover: any = [];

  @ViewChild('mobileCamInput', { static: false }) mobileCamInputRef!: ElementRef<HTMLInputElement>;

  isMobile = false;
  groupedPhotos: any = {};
  activeFolderTab: any = 0;
  youtubeCoverUrl: SafeResourceUrl | any;
  photoCaptured: boolean = false;
  capturedBlob: Blob | null = null;
  reviewModal: boolean = false;
  showThankyouMessage: boolean = false;

  currentPage = 1;
  limit = 20;
  loading = false;
  hasMore = true;
  private scrollTimeout: any;
  folders: any[] = [];
  selectedFolderId: any = 'all'; // '
  hasFaceDescriptorError: boolean = false;

  paginationMap: { [key: string]: { page: number, hasMore: boolean } } = {};
  photosByFolder: { [key: string]: any[] } = {};
  @ViewChild('youtubePlayer') youtubePlayer!: ElementRef | any;
  constructor(
    private route: ActivatedRoute,
    public loader: LoaderService,
    private eventService: PhotoSelectionService,
    private alert: AlertService,
    private service: AuthService,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {
    this.isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    this.scrollTop();
    this.userData = JSON.parse(<any>localStorage.getItem("userData"));
    setTimeout(() => {
      if (this.userData?.youtube_cover_url) {
        const videoId = this.extractYoutubeId(this.userData?.youtube_cover_url);
        // const videoUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1&autoplay=1`;
        this.youtubeCoverUrl = videoId;
      }
    }, 100);
    this.eventId = this.userData?.event_id;
    this.previewCover = JSON.parse(this.userData.ai_cover_images);
    if (this.userData && !this.userData?.isFaceDescriptorReady) {
      this.checkReadiness();
      this.intervalId = setInterval(() => {
        if (!this.isReady) {
          this.checkReadiness();
        }
      }, 10000);
    }
    // this.getPhotosByEventId();
    // this.loadPhotos();
    this.loadFolders();
    this.checkIsBrowseAllFolderStatus();

  }

  loadFolders() {
    console.log("JDNSDSM");

    this.eventService.getFoldersByEventId(
      this.eventId,
      this.userData?.created_by,
      (res: any) => {
        if (res.status == 200) {
          this.folders = res.data;
          console.log(`Loaded ${this.folders.length} folders`);
          // this.loadPhotos();
          setTimeout(() => {
            this.scrollTop();

          }, 0);

        }
      }
    );
  }

  onFolderChange(folderId: string | null) {
    if (this.selectedFolderId === folderId) return;

    console.log(`Switching to folder: ${folderId || 'Browse All'}`);

    this.selectedFolderId = folderId;

    // Initialize if not exists
    if (!this.paginationMap[folderId || 'all']) {
      this.paginationMap[folderId || 'all'] = { page: 1, hasMore: true };
    }

    if (!this.photosByFolder[folderId || 'all']) {
      this.photosByFolder[folderId || 'all'] = [];
    }

    // Reset UI to show relevant folder photos
    this.photos = this.photosByFolder[folderId || 'all'];

    if (this.photos.length === 0) {
      this.loadPhotos();
    }
  }

  loadPhotos() {
    const folderKey = this.selectedFolderId || 'all';
    const pagination = this.paginationMap[folderKey];

    if (this.loading || !pagination.hasMore) return;

    this.loading = true;

    const params: any = {
      event_id: this.eventId,
      created_by: this.userData?.created_by,
      page: pagination.page,
      limit: this.limit,
    };

    if (this.selectedFolderId) {
      params.folder_id = this.selectedFolderId;
    }

    this.eventService.getAllPhotosByEventId(params, this.userData?.created_by, (res: any) => {
      if (res.status == 200) {
        const folderPhotos = this.photosByFolder[folderKey] || [];
        this.photosByFolder[folderKey] = [...folderPhotos, ...res.data];
        this.photos = this.photosByFolder[folderKey];

        pagination.hasMore = pagination.page < res.pagination.totalPages;
        pagination.page++;

        // this.groupPhotosByFolder();
      }
      this.loading = false;
    });
  }

  @HostListener('window:scroll', ['$event'])
  onScroll() {
    if (this.scrollTimeout) clearTimeout(this.scrollTimeout);

    this.scrollTimeout = setTimeout(() => {
      const folderKey = this.selectedFolderId || 'all';
      const pagination = this.paginationMap[folderKey];

      // Don’t trigger if loading or no more data for this folder/all
      if (this.loading || !pagination?.hasMore) return;

      const threshold = 300;
      const position = window.pageYOffset + window.innerHeight;
      const height = document.documentElement.scrollHeight;

      if (position > height - threshold) {
        this.loadPhotos();
      }
    }, 200);
  }

  extractYoutubeId(url: any) {
    // const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|shorts\/|)([^#&?]+)/;
    // const match = url.match(regex);

    // if (match && match[1]) {
    //   return match[1];
    // } else {
    //   return null;
    // }
    const match = url.match(/v=([^&]+)/);
    return match ? match[1] : '';
  }
  checkIsBrowseAllFolderStatus() {
    this.eventService.checkIsBrowseAllFolderStatus({ event_id: this.userData?.event_id, user_id: this.userData?.user_id }, (res: any) => {
      if (res.status == 200) {
        this.isBrowseAllFolder = res.data;
        this.userData.is_browse_all_folder = this.isBrowseAllFolder;
      }
    })
  }


  checkReadiness() {
    this.http.get(environment.apiUrl + `/api/mystudio/photo-selection/checkEventReady/${this.userData.event_name.split(" ").join("_")}_${this.userData.event_id}`)
      .subscribe(
        (res: any) => {
          // this.isReady = res.isFaceDescriptorReady != 0 && res.isFaceDescriptorReady != '0' && res.isFaceDescriptorReady != 'false';
          this.isReady = res.data.status == 'completed';
          // this.isReady = res.data?.output?.body?.status == 'completed' || res.data?.output?.body?.status == 'partial';
          this.hasFaceDescriptorError = res.data.status == 'not_found';
          // this.hasFaceDescriptorError = res.data?.output?.body?.status == 'not_found';
          if (this.hasFaceDescriptorError) this.alert.error("Something went wrong, please contact to studio.");
          if (this.isReady) {
            this.hasFaceDescriptorError = false;
            this.eventService.updateFaceDescriptorEvent(this.userData.event_id, (res: any) => {
              if (res.status == 200) {
                this.userData.isFaceDescriptorReady = true;
              }
            })
            clearInterval(this.intervalId);
          }
        },
        (err: any) => {
          console.error('Failed to check event readiness', err);
        }
      );
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  }

  async onMobilePhotoCapture(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // const phone = this.aiGuestConfig.phone;
    // const isPhoneValid = phone && phone.length == 10;

    if (!file) {
      this.alert.error("No photo captured.");
      return;
    }

    this.photoCaptured = true;
    this.capturedBlob = file;

    if (!this.userData?.need_customer_number) {
      await this.sendToServer(file);
    }
  }

  canSubmit(): boolean {
    if (!this.photoCaptured) return false;

    if (this.userData?.need_customer_number) {
      const phone = this.aiGuestConfig.phone;
      return !!phone && phone.length == 10;
    }

    return true;
  }
  async submitPhoto() {
    if (!this.capturedBlob) {
      this.alert.error("No photo captured.");
      return;
    }

    if (this.userData?.need_customer_number) {
      const phone = this.aiGuestConfig.phone;
      if (!phone || phone.length !== 10) {
        this.alert.error("Please enter a valid 10-digit phone number.");
        return;
      }
    }

    if (!this.userData?.isFaceDescriptorReady) {
      this.addAiGuest();
      this.alert.info(
        "Your photo has been captured successfully. You will be notified once it's ready for AI sharing.",
        5000
      );
      return;
    }

    await this.sendToServer(this.capturedBlob);
    this.addAiGuest();
  }

  initReviewModal() {
    setTimeout(() => {
      const starCount = 5;
      let selected = 0;

      const starRating: any = document.getElementById('star-rating');
      let starTemplate: any = document.getElementById('star-template');
      starTemplate = starTemplate?.content;
      const textarea: any = document.getElementById('review-text');
      const postBtn: any = document.getElementById('post-btn');

      function setStars(count: any) {
        [...starRating.querySelectorAll('svg')].forEach((svg, i) => {
          if (i < count) {
            svg.setAttribute('fill', '#FFD600');
            svg.classList.add('scale-110');
          } else {
            svg.setAttribute('fill', 'none');
            svg.classList.remove('scale-110');
          }
        });
      }


      for (let i = 1; i <= starCount; i++) {
        const star = starTemplate.cloneNode(true);
        star.querySelector('svg').addEventListener('mouseenter', () => { setStars(i); });
        star.querySelector('svg').addEventListener('mouseleave', () => { setStars(selected); });
        star.querySelector('svg').addEventListener('click', () => {
          selected = i;
          setStars(selected);
          textarea.disabled = false;
          textarea.focus();
          postBtn.disabled = false;
          console.log(selected);
          if (selected == 5) {
            this.openGoogleReview();
          }
        });
        starRating.appendChild(star);
      }

      setStars(0);
      textarea.addEventListener('input', () => {
        postBtn.disabled = !(selected > 0 && textarea.value.trim().length > 0);
      });

      postBtn.addEventListener('click', () => {
        this.showThankyouMessage = true;
        this.alert.success("Thank you for your review!");
        setTimeout(() => { this.reviewModal = false; }, 5000);
      });

    }, 500);
  }

  openGoogleReview() {

    let reviewWindow: any = null;
    let poll: any = null;
    const url = this.userData?.google_review_url || '';
    const w = 500, h = 700;
    const left = (screen.width - w) / 2;
    const top = (screen.height - h) / 2;

    reviewWindow = window.open(url, "_blank", `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);

    if (!reviewWindow) {
      this.alert.error("Popup blocked! Opening in a new tab...", 4000);
      window.open(url, "_blank");
      return;
    }

    try { reviewWindow.opener = null; } catch (e) { }

    // Poll for popup close
    poll = setInterval(() => {
      if (!reviewWindow || reviewWindow.closed) {
        clearInterval(poll);
        reviewWindow = null;
        this.showThankyouMessage = true;
        this.alert.success("Thank you for your review!");
        setTimeout(() => { this.showThankyouMessage = false; this.reviewModal = false; }, 6000);
      }
    }, 800);
  }

  getPhotosByEventId() {
    this.eventService.getAllPhotosByEventId(this.eventId, this.userData?.created_by, (res: any) => {
      if (res.status == 200) {
        this.photos = res.data;
        this.groupPhotosByFolder();
      }

    })
  }

  groupPhotosByFolder() {
    this.groupedPhotos = {};
    this.photos.forEach((photo: any) => {
      if (!this.groupedPhotos[photo.folder_id]) {
        this.groupedPhotos[photo.folder_id] = [];
      }
      this.groupedPhotos[photo.folder_id].push(photo);
    });

    console.log(this.groupedPhotos);

  }

  async openCamera() {
    this.videoModal = true;
    this.aiGuestConfig = {};

    setTimeout(async () => {
      if (this.isMobile) {
        // ✅ One input triggers camera with switching option
        this.mobileCamInputRef?.nativeElement.click();
      } else {
        // ✅ Desktop: start webcam stream
        try {
          const video = this.videoRef?.nativeElement;
          this.videoStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' } // or omit facingMode to allow default
          });
          video.srcObject = this.videoStream;
          await video.play();
        } catch (err) {
          alert('Camera access denied or not supported.');
        }
      }
    }, 500);
  }


  async capturePhoto() {
    if (!this.videoStream) return this.alert.error('Camera not opened');

    try {
      const video = this.videoRef.nativeElement as HTMLVideoElement;
      const canvas = this.canvasRef.nativeElement as HTMLCanvasElement;
      const context = canvas.getContext('2d')!;
      const scaleFactor = 2;

      // Resize canvas to match video dimensions
      const width = video.videoWidth * scaleFactor;
      const height = video.videoHeight * scaleFactor;
      canvas.width = width;
      canvas.height = height;

      context.drawImage(video, 0, 0, width, height);

      // Convert canvas to Blob (JPEG, quality 0.9)
      const blob: Blob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9);
      });

      if (!blob) {
        return this.alert.error('Failed to capture image');
      }

      const phone = this.aiGuestConfig.phone;
      const isPhoneValid = phone && phone.length == 10;

      if (!this.userData?.isFaceDescriptorReady) {
        this.addAiGuest();
        this.alert.info('Your photo has been captured successfully. You will be notified once it is ready for AI sharing.', 5000);
        return;
      }

      if (this.userData?.need_customer_number && isPhoneValid && blob) {
        await this.sendToServer(blob);
        this.addAiGuest();
      }
      // Scenario 2: need_customer_number is false, file exists
      else if (!this.userData?.need_customer_number && blob) {
        this.sendToServer(blob);
      }
      else if (!this.userData?.need_customer_number && !blob) {
        this.alert.error("File is missing or no capture found.");
      }
      else if (this.userData?.need_customer_number && (!phone || phone.length !== 10)) {
        this.alert.error("Please enter a valid 10-digit phone number.");
      }
    } catch (error) {

      this.alert.error(`Error capturing image, ${error}`);
      this.isLoading = false;
    }
  }

  async sendToServer(blob: Blob) {
    this.matchedImages = [];
    const formData = new FormData();
    formData.append('input_img', blob, 'captured_image.jpeg');
    formData.append('wedding_folder_id', `${this.userData?.event_name.split(" ").join("_")}_${this.userData?.event_id}` || 'unknown');

    this.isLoading = true;

    this.http.post(environment.apiUrl + '/api/mystudio/photo-selection/find-person', formData)
      .subscribe({
        next: async (res: any) => {
          this.alert.success('Face matched successfully!');
          this.isLoading = false;
          this.matchedImages = JSON.parse(JSON.stringify(res.matches)) || [];
          if (this.matchedImages.length > 0 && this.userData?.need_customer_number && (this.userData?.google_review_url && this.userData?.google_review_url.startsWith('https://')) && await this.checkHasUserAlreadyReviewed()) {
            setTimeout(() => {
              this.triggerGoogleReview();
            }, 8000);
          }
          this.videoModal = false;
          this.activeTab = 'matched';
          this.activeFolderTab = null;
          // this.scrollTo('explore');
          this.onCancel();
        },
        error: (err) => {
          this.alert.error('Failed to process face match');
          this.isLoading = false;
          this.videoModal = false;
          this.onCancel();
        }
      });
  }


  async addAiGuest() {
    this.isLoading = true;
    const payload = {
      guest_name: this.userData?.name,
      guest_phone: this.aiGuestConfig?.phone,
      event_id: this.userData?.event_id,
      created_by: this.userData?.user_id,
      customer_unique_id: this.userData?.customer_unique_id,
    };

    this.eventService.addAiGuest(payload, (res: any) => {
      this.isLoading = false;
      if (res.status) {
        this.alert.success(res.message);
        this.onCancel();
      } else {
        this.alert.error(res.message);
      }
      this.loader.hide();
    });
  }


  retakeImage() {
    this.isImageCaptured = false;
    location.reload();
  }

  onBrowseAllFolder() {
    this.isBrowseAllFolder = true;
    this.photos.forEach((item: any) => item.seleted = false);
    this.isAllSelected = false;
  }

  trackPhotos(index: number, photo: any) {
    return photo.id;
  }

  toggleSelectAll(): void {
    this.isAllSelected = !this.isAllSelected;
    this.photos.forEach((photo: any) => (photo.selected = this.isAllSelected));
    this.imageSelected = this.photos.some((photo: any) => photo.selected)
  }

  updateSelectAllState(): void {
    this.imageSelected = this.photos.some((photo: any) => photo.selected)
  }

  downloadPhoto() {
    const selectedPhotos: any = this.photos.filter((photo: any) => photo.selected);
    selectedPhotos.forEach((photo: any, index: any) => {
      this.downloadFile(photo.photo_url, photo.photo_name);
    });

  }

  downloadSinglePhoto(photo: any, idx?: any) {
    this.downloadFile(photo.photo_url ? photo.photo_url : photo, photo.photo_name || `image-${idx}.jpg`);
  }

  togglePhoto(photo: any) {
    photo.selected = !photo.selected;
    this.updateSelectAllState();
  }

  private downloadFile(url: string, filename: string) {
    this.loader.show();
    this.isLoading = true;
    if (url.includes('firebasestorage.googleapis.com')) {
      fetch(url)
        .then(res => res.blob())
        .then(blob => {
          const blobUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          // a.target = '_blank';
          a.download = filename || 'photo';
          a.click();
          window.URL.revokeObjectURL(blobUrl);
          this.isLoading = false;
          this.loader.hide();
        });
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'photo';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        this.isLoading = false;
        this.loader.hide();
    }

  }

  goBack() {
    this.isBrowseAllFolder = false;
  }

  scrollTop() {
    window.scrollTo(0, 0);
  }

  scrollTo(elementId: string) {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.focus(); // optional: gives keyboard focus
    }
  }

  async onCancel() {
    this.videoModal = false;
    this.isImageCaptured = false;
    this.videoModal = false;

    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }

    const video = this.videoRef.nativeElement;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
  }

  triggerGoogleReview() {
    this.reviewModal = true;
    this.initReviewModal();
  }


  async checkHasUserAlreadyReviewed() {
    return new Promise((resolve, reject) => {
      this.eventService.checkHasUserAlreadyReviewed({ phone: this.aiGuestConfig.phone, user_id: this.userData?.user_id }, (res: any) => {
        if (res.status == 200) {
          resolve(!res.data);
        }
      })
    })
  }

  ngAfterViewInit() {
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 200);
  }

  onPlayerReady(event: any) {
    console.log(event.target);
    event.target.unMute();
    event.target.setVolume(100);
    setTimeout(() => {
      event.target.playVideo();
    }, 1000);
  }
}
