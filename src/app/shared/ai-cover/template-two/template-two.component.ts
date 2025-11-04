import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, inject, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LoaderService } from '../../loader.service';
import { PhotoSelectionService } from '../../../services/photo-selection.service';
import { AlertService } from '../../../services/alert.service';
import { AuthService } from '../../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../../environments/environment';
import { UniqueFolderIdPipe } from '../../unique-folder-id.pipe';


@Component({
  selector: 'app-template-two',
  standalone: true,
  imports: [CommonModule, FormsModule, UniqueFolderIdPipe],
  templateUrl: './template-two.component.html',
  styleUrl: './template-two.component.scss'
})
export class TemplateTwoComponent {
  isHeaderScrolled = false;
  currentYear = new Date().getFullYear();

  carouselImages: any[] = [];

  currentSlide = 0;
  carouselInterval: any;

  activeTab = 'browse';

  allImages: any[] = [];

  isModalOpen = false;
  currentImageIndex = 0;
  currentImage: any | null = null;

  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement> | any;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement> | any;

  matchedImages: any[] = [];

  ai_upload_user: any = { phone: 0, name: '', otp: 0 }
  isOTPSent: boolean = false;
  otpcode: number = 0;
  isOtpVerified: boolean = false;
  // storage = inject(Storage);
  eventId: any = '';
  isImageCaptured: boolean = false;
  capturedGuestImage: any = {};
  aiGuestConfig: any = {};
  eventData: any = {};
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
  isMatchedModalOpen: boolean = false;

  // Add these properties to your class
  isCameraModalOpen = false;
  videoStream: MediaStream | null = null;
  videoElement: HTMLVideoElement | null = null;

  currentPage = 1;
  limit = 50;
  loading = false;
  hasMore = true;
  private scrollTimeout: any;

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

    this.userData = JSON.parse(<any>localStorage.getItem("userData"));
    if (this.userData?.youtube_cover_url) {
      const videoId = this.extractYoutubeId(this.userData?.youtube_cover_url);
      const videoUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1&autoplay=1`;
      this.youtubeCoverUrl = this.sanitizer.bypassSecurityTrustResourceUrl(videoUrl);
    }
    this.eventId = this.userData?.event_id;
    this.carouselImages = JSON.parse(this.userData.ai_cover_images);
    console.log("this.p", this.carouselImages);
    if (this.userData && !this.userData?.isFaceDescriptorReady) {
      this.checkReadiness();
      this.intervalId = setInterval(() => {
        if (!this.isReady) {
          this.checkReadiness();
        }
      }, 5000);
    }
    // this.getPhotosByEventId();
    this.loadPhotos();
    this.checkIsBrowseAllFolderStatus();
  }

  extractYoutubeId(url: any) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|shorts\/|)([^#&?]+)/;
    const match = url.match(regex);

    if (match && match[1]) {
      return match[1];
    } else {
      return null;
    }
  }
  checkIsBrowseAllFolderStatus() {
    this.eventService.checkIsBrowseAllFolderStatus({ event_id: this.userData?.event_id, user_id: this.userData?.user_id }, (res: any) => {
      if (res.status == 200) {
        this.isBrowseAllFolder = res.data;
        this.userData.is_browse_all_folder = this.isBrowseAllFolder;
      }
    })
  }

  loadPhotos() {
    if (this.loading || !this.hasMore) return;

    this.loading = true;
    const params: any = {
      event_id: this.eventId,
      created_by: this.userData?.created_by,
      page: this.currentPage,
      limit: this.limit
    }
    this.eventService.getAllPhotosByEventId(params, this.userData?.created_by,
      (res: any) => {
        if (res.status == 200) {
          this.photos = [...this.photos, ...res.data];
          this.hasMore = this.currentPage < res.pagination.totalPages;
          this.currentPage++;
          this.groupPhotosByFolder();
        }
        this.loading = false;
      }
    );
  }

  @HostListener('window:scroll', ['$event'])
  onScroll() {
    // Clear previous timeout to debounce
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Add debounce delay
    this.scrollTimeout = setTimeout(() => {
      // Don't trigger if already loading or no more data
      if (this.loading || !this.hasMore) return;

      const threshold = 300; // Trigger 300px before bottom
      const position = window.pageYOffset + window.innerHeight;
      const height = document.documentElement.scrollHeight;

      if (position > height - threshold) {
        this.loadPhotos();
      }
    }, 200); // 200ms debounce delay
  }


  checkReadiness() {
    this.http.get(environment.apiUrl + `/api/mystudio/photo-selection/checkEventReady/${this.eventId}`)
      .subscribe(
        (res: any) => {
          this.isReady = res.isFaceDescriptorReady;
          if (this.isReady) {
            this.userData.isFaceDescriptorReady = true;
            clearInterval(this.intervalId);
          }
        },
        (err: any) => {
          console.error('Failed to check event readiness', err);
        }
      );
  }
  async onMobilePhotoCapture(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
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

  ngOnInit(): void {
    this.startCarousel();
    window.addEventListener('scroll', this.onScrolls.bind(this));
  }

  ngOnDestroy(): void {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
    window.removeEventListener('scroll', this.onScrolls.bind(this));
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  }

  onScrolls(): void {
    this.isHeaderScrolled = window.scrollY > 50;
  }

  startCarousel(): void {
    this.carouselInterval = setInterval(() => {
      this.nextSlide();
    }, 4000);
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.carouselImages.length;
  }

  prevSlide(): void {
    this.currentSlide = this.currentSlide === 0
      ? this.carouselImages.length - 1
      : this.currentSlide - 1;
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
  }

  openModal(image: any): void {
    this.currentImage = image;
    this.currentImageIndex = this.photos.findIndex((img: any) => img.id == image.id);
    this.isModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  openMatchedModal(image: any): void {
    this.currentImage = image;
    this.isMatchedModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.currentImage = null;
    this.isMatchedModalOpen = false;
    document.body.style.overflow = 'auto';
  }

  trackPhotos(index: number, photo: any) {
    return photo.id;
  }

  nextImage(): void {
    this.currentImageIndex = (this.currentImageIndex + 1) % this.photos.length;
    this.currentImage = this.photos[this.currentImageIndex];
  }

  prevImage(): void {
    this.currentImageIndex = this.currentImageIndex === 0
      ? this.photos.length - 1
      : this.currentImageIndex - 1;
    this.currentImage = this.photos[this.currentImageIndex];
  }

  triggerGoogleReview() {
    this.reviewModal = true;
    this.initReviewModal();
  }

  downloadSinglePhoto(photo: any, idx?: any) {
    this.downloadFile(photo.photo_url ? photo.photo_url : photo, photo.photo_name || `image-${idx}.jpg`);
  }

  downloadFile(url: any, filename: string) {
    this.loader.show();
    this.isLoading = true;
    try {
      fetch(url)
        .then(res => res.blob())
        .then(blob => {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = filename;
          link.click();
          URL.revokeObjectURL(link.href);

          this.isLoading = false;
        })
        .catch(err => console.error('Error downloading file:', err));
      this.loader.hide();
    } catch (err) {
      this.isLoading = false;
      this.loader.hide();
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
          this.matchedImages = JSON.parse(JSON.stringify(res.match_list)) || [];
          if (this.matchedImages.length > 0 && this.userData?.need_customer_number && (this.userData?.google_review_url && this.userData?.google_review_url.startsWith('https://')) && await this.checkHasUserAlreadyReviewed()) {
            setTimeout(() => {
              this.triggerGoogleReview();
            }, 15000);
          }
          this.videoModal = false;
          this.activeTab = 'matched';
          this.activeFolderTab = null;
          this.scrollTo('explore');
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

  async onCancel() {
    this.videoModal = false;
    this.isImageCaptured = false;
    this.videoModal = false;
    this.closeCameraModal();
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

  scrollTo(elementId: string) {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.focus(); // optional: gives keyboard focus
    }
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

  async openCameraModal(): Promise<void> {
    this.isCameraModalOpen = true;
    document.body.style.overflow = 'hidden';

    try {
      // Wait for DOM to render
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get video element
      this.videoElement = document.getElementById('cameraVideo') as HTMLVideoElement;

      // Request camera access
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });

      if (this.videoElement) {
        this.videoElement.srcObject = this.videoStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please make sure you have granted camera permissions.');
      this.closeCameraModal();
    }
  }

  closeCameraModal(): void {
    // Stop all video tracks
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }

    this.isCameraModalOpen = false;
    this.videoElement = null;
    document.body.style.overflow = 'auto';
  }
  async captureImage() {
    if (!this.videoStream) return this.alert.error('Camera not opened');
    if (!this.videoElement) return;
    try {
      this.isLoading = true;
      const canvas = document.createElement('canvas');
      canvas.width = this.videoElement.videoWidth;
      canvas.height = this.videoElement.videoHeight;

      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);

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
          this.isLoading = false;
        }
        else if (!this.userData?.need_customer_number && !blob) {
          this.alert.error("File is missing or no capture found.");
          this.isLoading = false;
        }
        else if (this.userData?.need_customer_number && (!phone || phone.length !== 10)) {
          this.alert.error("Please enter a valid 10-digit phone number.");
          this.isLoading = false;
        }
      }
    } catch (error) {

      this.alert.error(`Error capturing image, ${error}`);
      this.isLoading = false;
    }
  }

}
