import { Component, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
@Component({
  selector: 'app-ai-upload',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './ai-upload.component.html',
  styleUrl: './ai-upload.component.scss'
})
export class AiUploadComponent {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef;
  @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef;
  capturedImage: any | null = null;

  ai_upload_user:any={phone:0,name:'',otp:0}
  isOTPSent:boolean=false;
  otpcode:number=0;
  isOtpVerified:boolean=false;

  constructor(private route:ActivatedRoute,private service:AuthService) {
    this.route.queryParams.subscribe(params => {
      console.log(params);
    })
  }

  ngAfterViewInit() {
    this.startCamera();
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
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    this.capturedImage = canvas.toDataURL('image/png'); // Base64 image

    // Convert Base64 to Blob and send it to the backend
    this.uploadImage(this.dataURLtoFile(this.capturedImage, 'captured.png'));
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

  uploadImage(imageFile: File) {
    // const formData = new FormData();
    // formData.append('image', imageFile);

    // this.http.post('http://localhost:3000/recognize-face', formData)
    //   .subscribe(response => {
    //     console.log('Face recognition result:', response);
    //   });
  }

  sendOtp(){
    this.service.sendOTP({phone_number:this.ai_upload_user.phone,name:this.ai_upload_user.name},(res:any)=>{
      this.isOTPSent = true; 
      console.log(res);
      this.otpcode = res.otp;
    })
  }

  verifyOTP(){
    if(this.ai_upload_user.otp != this.otpcode){
      alert("OTP not verified")
      this.isOtpVerified = false;
    }else{
      this.isOtpVerified = true;
      alert("OTP Verified");
    }
  }
}
