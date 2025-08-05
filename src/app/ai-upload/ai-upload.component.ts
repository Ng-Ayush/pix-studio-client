import { Component, ViewChild, ElementRef, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
import { PhotoSelectionService } from '../services/photo-selection.service';
import { AlertService } from '../services/alert.service';
import { LoaderService } from '../shared/loader.service';
@Component({
  selector: 'app-ai-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-upload.component.html',
  styleUrl: './ai-upload.component.scss'
})
export class AiUploadComponent {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef;
  @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef;
  capturedImage: any | null = null;

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

  constructor(private route: ActivatedRoute, public loader: LoaderService, private eventService: PhotoSelectionService, private alert: AlertService, private service: AuthService) {
    this.route.queryParams.subscribe(params => {
      console.log(params);
      if (params['event-id'])
        this.eventId = params['event-id'];
      this.getEventDetailsById();
    })
  }

  ngAfterViewInit() {
    this.startCamera();
  }

  getEventDetailsById() {
    this.eventService.getEventById(this.eventId, (res: any) => {
      if (res.status == 200) {
        this.eventData = res.data;
        this.userData = res.data;
      }

    })
  }

  startCamera() {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        this.videoElement.nativeElement.srcObject = stream;
      })
      .catch((err) => {
        console.error('Error accessing camera:', err);
      });
  }

  captureImage() {
    this.isImageCaptured = true;
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    this.capturedImage = canvas.toDataURL('image/png');

    this.capturedGuestImage = this.dataURLtoFile(this.capturedImage, 'captured.png');
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
}
