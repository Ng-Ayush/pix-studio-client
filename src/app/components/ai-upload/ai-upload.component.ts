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
@Component({
  selector: 'app-ai-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, NgOptimizedImage],
  templateUrl: './ai-upload.component.html',
  styleUrls: ["./ai-upload.component.scss", "../../../assets/css/style.css", "../../../assets/css/bootstrap.min.css"]
})
export class AiUploadComponent {
  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  activeTab: 'browse' | 'matched' = 'browse';

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

  constructor(
    private route: ActivatedRoute,
    public loader: LoaderService,
    private eventService: PhotoSelectionService,
    private alert: AlertService,
    private service: AuthService,
    private http: HttpClient
  ) {

    this.userData = JSON.parse(<any>localStorage.getItem("userData"));
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

  async ngOnInit() {
    try {
      
      // Load face-api.js models (adjust path to models folder)
      const MODEL_URL = '../../../assets/models';
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    } catch (error) {
      console.log("Got erro loading modles",error);
      
    }
  }



  ngAfterViewInit() {
    // this.startCamera();
  }

  getPhotosByEventId() {
    this.eventService.getAllPhotosByEventId(this.eventId, this.userData?.created_by, (res: any) => {
      if (res.status == 200) {
        this.photos = res.data;
        // this.userData = res.data;
      }

    })
  }

  async openCamera() {
    this.alert.info("Please upgrade your plan to use this feature", 4000);
    return;
    // this.videoModal = true;
    // setTimeout(async () => {
    //   const video = this.videoRef.nativeElement;
    //   if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    //     this.videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
    //     video.srcObject = this.videoStream;
    //     await video.play();
    //   } else {
    //     alert('Camera API not supported');
    //   }
    // }, 0);
  }

  async capturePhoto() {
    if (!this.videoStream) return alert('Camera not opened');
    try {
      const video = this.videoRef.nativeElement;
      const canvas = this.canvasRef.nativeElement;
      const context = canvas.getContext('2d')!;
      const scaleFactor = 2;
      const width = video.videoWidth * scaleFactor;
      const height = video.videoHeight * scaleFactor;

      // Resize canvas to higher resolution
      canvas.width = width;
      canvas.height = height;

      // Draw video frame scaled to larger size
      context.drawImage(video, 0, 0, width, height);

      const capturedDataUrl = canvas.toDataURL('image/png');
      if (!!this.userData?.isFaceDescriptorReady) {
        this.isLoading = true;
        // Extract face descriptor of captured image
        const tempUrl = "https://firebasestorage.googleapis.com/v0/b/surajproductions-3f28b.firebasestorage.app/o/DSC_4400.JPG?alt=media&token=bb2550d7-c1fd-42a6-a152-cd940acbe78c"
        const capturedDescriptor = await this.getFaceDescriptorFromDataURL(capturedDataUrl);
        if (!capturedDescriptor) {
          this.isLoading = false;
          return this.alert.error('No face detected in captured photo');
        }

        // Filter matches from photosArray
        this.matchedImages = await this.filterMatches(capturedDescriptor, this.photos);
        console.log("MATCHED", this.matchedImages);
        this.videoModal = false;
        this.activeTab = 'matched';
        this.scrollTo('explore');
        this.alert.success("Successfully Found Photos");
        this.isLoading = false;
        this.onCancel();
      } else {
        this.isLoading = false;
        this.videoModal = false;
        this.onCancel();
        this.alert.info("Your face has been captured, please come back after sometime");
      }
    } catch (error) {
      this.isLoading = false;
    }

  }

  async getFaceDescriptorsFromUrl(url: string): Promise<Float32Array[]> {
    const img = await faceapi.fetchImage(url);
    const detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();
    return detections.map(det => det.descriptor);
  }

  // Capture face descriptor from a single face image Data URL (still needed for capture)
  async getFaceDescriptorFromDataURL(dataUrl: string): Promise<Float32Array | null> {
    const img = await faceapi.fetchImage(dataUrl);
    const detection = await faceapi.detectSingleFace(img, new faceapi.SsdMobilenetv1Options())
      .withFaceLandmarks()
      .withFaceDescriptor();
    return detection ? detection.descriptor : null;
  }

  // Filter photos by matching captured descriptor against all stored descriptors (multiple per photo)
  async filterMatches(capturedDescriptor: Float32Array, photosArray: any[]) {
    const threshold = 0.5;
    return photosArray.filter(photo => {
      if (!photo.face_descriptor) return false;
      const descriptors = JSON.parse(photo.face_descriptor) as number[][];
      return descriptors.some(desc => {
        const storedDesc = new Float32Array(desc);
        const distance = faceapi.euclideanDistance(capturedDescriptor, storedDesc);
        return distance < threshold;
      });
    });
  }

  submitAiGuest() {
    this.onImgUpload();
  }

  onImgUpload() {
    this.loader.show();
    this.isFormValid = false;
    const file = this.capturedGuestImage;
    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onload = async () => {
      let compressedImage = reader.result as string;
      let blob = this.dataURLtoBlob(compressedImage);
      const fileRef = ref(this.storage, `AI-Guest-Photo/${this.eventData.event_name}/${this.ai_upload_user.name}`);
      const uploadTask = uploadBytesResumable(fileRef, blob);

      uploadTask.then(async () => {
        const url = await getDownloadURL(fileRef);
        this.aiGuestConfig = { image_url: url, guest_name: this.ai_upload_user.name, guest_phone: this.ai_upload_user.phone, event_id: this.eventId };
        this.addAiGuest();
      })
    }
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


  sendOtp() {
    this.service.sendOTP({ phone_number: this.ai_upload_user.phone, name: this.ai_upload_user.name, is_ai_guest: true, event_id: this.eventId }, (res: any) => {
      if (res.status == 200) {
        this.isOTPSent = true;
        console.log(res);
        this.otpcode = res.otp;
      } else {
        this.alert.error(res.message);
        this.isOTPSent = true;
        this.otpcode = res.error.otp;
        console.log(res);
      }
    })
  }

  verifyOTP() {
    if (this.ai_upload_user.otp != this.otpcode) {
      this.alert.error("OTP not verified");
      this.isOtpVerified = false;
    } else {
      this.isFormValid = true;
      this.alert.success("OTP Verified");
    }
  }

  addAiGuest() {
    this.eventService.addAiGuest(this.aiGuestConfig, (res: any) => {
      if (res.status) {
        this.alert.success(res.message);
        this.isOtpVerified = true;
        this.loader.hide();
      } else {
        this.alert.error(res.message);
        this.loader.hide();
        this.isFormValid = true;
      }
    })
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

  downloadSinglePhoto(photo: any) {
    this.downloadFile(photo.photo_url, photo.photo_name);
  }

  togglePhoto(photo: any) {
    photo.selected = !photo.selected;
    this.updateSelectAllState();
  }

  private downloadFile(url: string, filename: string) {
    this.loader.show();
    this.isLoading = true;

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

}
