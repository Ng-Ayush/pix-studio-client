import { Component, ViewChild, ElementRef, inject } from '@angular/core';
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
@Component({
  selector: 'app-ai-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, UniqueFolderIdPipe],
  templateUrl: './ai-upload.component.html',
  styleUrls: ["./ai-upload.component.scss", "../../../assets/css/style.css", "../../../assets/css/bootstrap.min.css"]
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
  storage = inject(Storage);
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
    this.previewCover = JSON.parse(this.userData.ai_cover_images);
    console.log("this.p", this.previewCover);
    if (this.userData && !this.userData?.isFaceDescriptorReady) {
      this.checkReadiness();
      this.intervalId = setInterval(() => {
        if (!this.isReady) {
          this.checkReadiness();
        }
      }, 5000);
    }
    this.getPhotosByEventId();
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

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
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

    // If phone not required, directly send
    if (!this.userData?.need_customer_number) {
      await this.sendToServer(file);
      // this.addAiGuest();
    }

    // if(!this.userData?.isFaceDescriptorReady){
    //   this.addAiGuest();
    //   this.alert.info('Your smile has been captured. You will be notified once it is ready.',5000);
    //   return;
    // }

    // if (this.userData?.need_customer_number && isPhoneValid && file) {
    //   await this.sendToServer(file);
    //   this.addAiGuest();
    // }
    // // Scenario 2: need_customer_number is false, file exists
    // else if (!this.userData?.need_customer_number && file) {
    //   this.sendToServer(file);
    // }
    // else if (!this.userData?.need_customer_number && !file) {
    //   this.alert.error("File is missing or no capture found.");
    // }
    // else if (this.userData?.need_customer_number && (!phone || phone.length !== 10)) {
    //   this.alert.error("Please enter a valid 10-digit phone number.");
    // }
    // return;
  }

  canSubmit(): boolean {
    // Must have a captured photo
    if (!this.photoCaptured) return false;

    // If phone required → validate
    if (this.userData?.need_customer_number) {
      const phone = this.aiGuestConfig.phone;
      return !!phone && phone.length == 10;
    }

    // If not required → just photo is enough
    return true;
  }
  async submitPhoto() {
    if (!this.capturedBlob) {
      this.alert.error("No photo captured.");
      return;
    }

    // Validate phone if required
    if (this.userData?.need_customer_number) {
      const phone = this.aiGuestConfig.phone;
      if (!phone || phone.length !== 10) {
        this.alert.error("Please enter a valid 10-digit phone number.");
        return;
      }
    }

    // If userData indicates face not ready
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

        // this.userData = res.data;
      }

    })
  }

  groupPhotosByFolder() {
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
          this.matchedImages = JSON.parse(JSON.stringify(res.match_list)) || [];
          if (this.matchedImages.length > 0 && this.userData?.need_customer_number && (this.userData?.google_review_url && this.userData?.google_review_url.startsWith('https://')) && await this.checkHasUserAlreadyReviewed()) {
            setTimeout(() => {
              this.triggerGoogleReview();
            }, 15000);
          }
          this.videoModal = false;
          this.activeTab = 'matched';
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

  // dataURLtoBlob(dataURL: string): Blob {
  //   const arr = dataURL.split(',');
  //   const mime = arr[0].match(/:(.*?);/)![1];
  //   const bstr = atob(arr[1]);
  //   let n = bstr.length;
  //   const u8arr = new Uint8Array(n);
  //   while (n--) u8arr[n] = bstr.charCodeAt(n);
  //   return new Blob([u8arr], { type: mime });
  // }

  // async getFaceDescriptorsFromUrl(url: string): Promise<Float32Array[]> {
  //   const img = await faceapi.fetchImage(url);
  //   const detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
  //     .withFaceLandmarks()
  //     .withFaceDescriptors();
  //   return detections.map(det => det.descriptor);
  // }

  // // Capture face descriptor from a single face image Data URL (still needed for capture)
  // async getFaceDescriptorFromDataURL(dataUrl: string): Promise<Float32Array | null> {
  //   const img = await faceapi.fetchImage(dataUrl);
  //   const detection = await faceapi.detectSingleFace(img, new faceapi.SsdMobilenetv1Options())
  //     .withFaceLandmarks()
  //     .withFaceDescriptor();
  //   return detection ? detection.descriptor : null;
  // }

  // // Filter photos by matching captured descriptor against all stored descriptors (multiple per photo)
  // async filterMatches(capturedDescriptor: Float32Array, photosArray: any[]) {
  //   const threshold = 0.5;
  //   return photosArray.filter(photo => {
  //     if (!photo.face_descriptor) return false;
  //     const descriptors = JSON.parse(photo.face_descriptor) as number[][];
  //     return descriptors.some(desc => {
  //       const storedDesc = new Float32Array(desc);
  //       const distance = faceapi.euclideanDistance(capturedDescriptor, storedDesc);
  //       return distance < threshold;
  //     });
  //   });
  // }


  // sendOtp() {
  //   this.service.sendOTP({ phone_number: this.ai_upload_user.phone, name: this.ai_upload_user.name, is_ai_guest: true, event_id: this.eventId }, (res: any) => {
  //     if (res.status == 200) {
  //       this.isOTPSent = true;
  //       console.log(res);
  //       this.otpcode = res.otp;
  //     } else {
  //       this.alert.error(res.message);
  //       this.isOTPSent = true;
  //       this.otpcode = res.error.otp;
  //       console.log(res);
  //     }
  //   })
  // }

  // verifyOTP() {
  //   if (this.ai_upload_user.otp != this.otpcode) {
  //     this.alert.error("OTP not verified");
  //     this.isOtpVerified = false;
  //   } else {
  //     this.isFormValid = true;
  //     this.alert.success("OTP Verified");
  //   }
  // }

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
    }catch(err){
      this.isLoading = false;
      this.loader.hide();
    }

  }

  goBack() {
    this.isBrowseAllFolder = false;
  }

  scrollTop() {
    window.scroll(0, 0);
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
}
