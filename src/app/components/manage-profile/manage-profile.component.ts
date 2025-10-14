import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { interval } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin.service';
import { AlertService } from '../../services/alert.service';
import { getMetadata } from 'firebase/storage';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
import { ImageCompressionService } from '../../services/image-compression.service';
import { SocketService } from '../../shared/socket.service';
@Component({
  selector: 'app-manage-profile',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, FormsModule],
  templateUrl: './manage-profile.component.html',
  styleUrl: './manage-profile.component.scss'
})
export class ManageProfileComponent {
  userForm: FormGroup;
  showPassword = false;
  isSubmitting = false;
  todayDate: any = new Date();
  searchTerm: any = ''
  currentUserId: any = 0;
  storage = inject(Storage);
  tempStudioIcon: any = '';
  userData: any = {};
  showLogOutModal: boolean = false;
  iconLoader: boolean = false;
  isConnected = false;

  qrCode: any = '';
  authenticated: any = 'e41779';
  ready: boolean = false;
  syncing: boolean = false;
  isLoading: boolean = false;
  showWhatsappModal: boolean = false;
  disconnectModal: boolean = false;
  modalTimeoutId: any = '';

  constructor(private fb: FormBuilder,
    private service: AdminService,
    private alert: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private imgCompress: ImageCompressionService,
    private socketService: SocketService
  ) {
    this.userForm = this.fb.group({
      studio_name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone_number: ['', [Validators.required]],
      address: ['', [Validators.required]],
      terms_and_condition: ['', [Validators.required]],
      studio_icon: ['', Validators.required],
      youtube_url: ['', Validators.required],
      instagram_url: ['', Validators.required],
      facebook_url: ['', Validators.required],
    });
    // this.userData = JSON.parse(<any>localStorage.getItem("userData"));
  }

  ngOnInit() {
    this.currentUserId = JSON.parse(<any>localStorage.getItem("currentUserId"));
    this.getUserDataCurrentId();
    this.socketService.onQR().subscribe(qr => {
      this.qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qr)}`;
      setTimeout(() => {
        this.isLoading = false;
      }, 1000);
      console.log("QR CODE", this.qrCode);
    });
    this.socketService.onAuthenticated().subscribe(() => {
      this.authenticated = true;
      this.syncing = true;
      this.isConnected = !this.isConnected;
      this.qrCode = null;
      this.showWhatsappModal = false;
    });
    this.socketService.onReady().subscribe(() => {
      this.ready = true;
      this.syncing = false;
      this.alert.success("Whatsapp is ready");
      this.showWhatsappModal = false;
    });
    this.socketService.onDisconnected().subscribe(reason => {
      this.ready = false;
      this.isConnected = false;
      this.alert.error("Whatsapp disconnected");
    });

  }

  connectWhatsapp() {
    if (!this.isConnected) {
      this.isLoading = true;
      this.showWhatsappModal = true;
      if (this.modalTimeoutId) {
        clearTimeout(this.modalTimeoutId);
      }
      this.modalTimeoutId = setTimeout(() => {
        this.isLoading = false;
        this.showWhatsappModal = false;
        this.modalTimeoutId = null;
      }, 20000);
      this.socketService.connect(this.userData.id);
      this.service.connectToWhatsApp(this.userData.id, (res: any) => {
        if (res.status == 200 && !res.qr) {
          this.isLoading = false;
        } else if (res.status == 200 && res.qr) {
          this.qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(res.qr)}`;
          setTimeout(() => {
            this.isLoading = false;
          }, 3000);
        }
      })
    } else {
      this.disconnectWhatsappModal();
    }

  }

  disconnectWhatsappModal() {
    this.disconnectModal = true;
  }

  getUserDataCurrentId() {
    this.service.getUsersByCurrentId(this.currentUserId, (res: any) => {
      localStorage.setItem("userData", JSON.stringify(res));
      this.userData = res;
      if (res?.whatsapp_status == 'ready') {
        this.isConnected = true;
      }
      this.userForm.patchValue(res)
    })

  }
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      this.service.updateProfile({ ...this.userForm.value, id: this.currentUserId }, (res: any) => {
        if (res.status == 200) {
          this.alert.success(res.message);
          this.getUserDataCurrentId();
          this.router.navigate(['dashboard']);
        } else {
          this.alert.error(res.message);
        }
      })
      this.isSubmitting = false;
      this.userForm.reset();
    } else {
      Object.keys(this.userForm.controls).forEach(key => {
        this.userForm.get(key)?.markAsTouched();
      });
    }
  }

  onImgUpload(event: any) {
    this.iconLoader = true;
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onload = async () => {
      let compressedImage = reader.result as string;
      let blob = this.dataURLtoBlob(compressedImage);
      const fileRef = ref(this.storage, `studio-icon/${this.userForm.value.studio_name.split(" ").join("_")}/${this.userData.id}`);
      const uploadTask = uploadBytesResumable(fileRef, blob);

      uploadTask.then(async () => {
        const url = await getDownloadURL(fileRef);
        this.iconLoader = false;
        this.userForm.patchValue({ studio_icon: url })
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

  toggleLogoutModal() {
    this.showLogOutModal = !this.showLogOutModal;
  }

  logout() {
    this.showLogOutModal = false;
    localStorage.clear();
    this.alert.success('Logout Successfully');
    this.router.navigate(['/login']);
  }

  disconnectWhatsApp() {
    this.isLoading = true;
    this.service.disconnectWhatsApp(this.userData.id, (res: any) => {
      this.isLoading = false;
      if (res.status == 200) {
        this.alert.success(res.message);
        this.isConnected = false;
        this.ready = false;
        this.authenticated = false;
        this.disconnectModal = false;
      } else {
        this.alert.error(res.message);
      }
    })
  }

}
