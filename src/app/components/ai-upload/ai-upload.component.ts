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
    if (this.userData && !!this.userData?.isFaceDescriptorReady) {
      this.checkReadiness();
      this.intervalId = setInterval(() => {
        if (!this.isReady) {
          this.checkReadiness();
        }
      }, 5000);
    }
    this.getPhotosByEventId();

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
    // Load face-api.js models (adjust path to models folder)
    const MODEL_URL = '../../../assets/models';
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
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
    this.videoModal = true;
    setTimeout(async () => {
      const video = this.videoRef.nativeElement;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = this.videoStream;
        await video.play();
      } else {
        alert('Camera API not supported');
      }
    }, 0);
  }

  async capturePhoto() {
    if (!this.videoStream) return alert('Camera not opened');
    try {
      const video = this.videoRef.nativeElement;
      const canvas = this.canvasRef.nativeElement;
      const context = canvas.getContext('2d')!;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const capturedDataUrl = canvas.toDataURL('image/png');

      if (!!this.userData?.isFaceDescriptorReady) {
        this.isLoading = true;
        // Extract face descriptor of captured image
        // const tempUrl = "https://firebasestorage.googleapis.com/v0/b/surajproductions-3f28b.firebasestorage.app/o/photos%2Fstudio_Production%20Testing%20Global%2Fbebo%20badmash%2FHelllo%2FNew%20Folder%201%2Fgettyimages-1718250850-612x612.jpg?alt=media&token=d6f6781d-35d8-4ab6-9fdb-20b3fb7bd3ca"
        const capturedDescriptor = await this.getFaceDescriptorFromDataURL(capturedDataUrl);
        if (!capturedDescriptor) return alert('No face detected in captured photo');

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
        this.alert.info("Your face has been captured, please come back after sometime");
      }
    } catch (error) {
      this.isLoading = false;
    }

  }

  async getFaceDescriptorFromDataURL(dataUrl: string): Promise<Float32Array | null> {
    const img = await faceapi.fetchImage(dataUrl);
    const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    return detection ? detection.descriptor : null;
  }

  async filterMatches(capturedDescriptor: Float32Array, photosArray: any[]) {
    const threshold = 0.6;
    return photosArray.filter(photo => {
      if (!photo.face_descriptor) return false;
      const storedDescriptor = new Float32Array(JSON.parse(photo.face_descriptor));
      const distance = faceapi.euclideanDistance(capturedDescriptor, storedDescriptor);
      return distance < threshold;
    });
  }

  dataURLtoFile(dataurl: string, filename: string) {
    let arr = dataurl.split(',');
    let mime = arr[0].match(/:(.*?);/)![1];
    let bstr = atob(arr[1]);
    let n = bstr.length;
    let u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
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
