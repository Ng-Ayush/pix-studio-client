import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';

import { AdminService } from '../../services/admin.service';
import { AlertService } from '../../services/alert.service';
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

  currentUserId: any = 0;
  userData: any = {};

  storage = inject(Storage);
  iconLoader = false;

  // 🔌 WhatsApp states
  isConnected = false;
  isLoading = false;
  ready = false;
  authenticated = false;
  syncing = false;

  qrCode: string | null = null;
  showWhatsappModal = false;
  disconnectModal = false;

  private modalTimeoutId: any = null;
  lastQr: string | null = null;

  constructor(
    private fb: FormBuilder,
    private service: AdminService,
    private alert: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private imgCompress: ImageCompressionService,
    private socketService: SocketService
  ) {
    this.userForm = this.fb.group({
      studio_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone_number: ['', Validators.required],
      address: ['', Validators.required],
      terms_and_condition: ['', Validators.required],
      studio_icon: ['', Validators.required],
      youtube_url: ['', Validators.required],
      instagram_url: ['', Validators.required],
      facebook_url: ['', Validators.required],
    });
  }

  // -------------------- INIT --------------------
  ngOnInit() {
    this.currentUserId = JSON.parse(localStorage.getItem('currentUserId') as any);
    this.getUserDataCurrentId();

    // 🔌 connect socket once
    this.socketService.connect(this.currentUserId);

    // 📲 QR
    // this.socketService.onQR().subscribe(qr => {
    //   this.qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qr)}`;
    //   this.isLoading = false;
    //   this.showWhatsappModal = true;
    // });

    // // 🔐 Authenticated
    // this.socketService.onAuthenticated().subscribe(() => {
    //   this.authenticated = true;
    //   this.syncing = true;
    //   this.qrCode = null;
    //   this.showWhatsappModal = false;
    // });

    // // ✅ Ready
    // this.socketService.onReady().subscribe(() => {
    //   this.ready = true;
    //   this.isConnected = true;
    //   this.syncing = false;
    //   this.isLoading = false;
    //   this.showWhatsappModal = false;
    //   this.alert.success('WhatsApp is ready');
    // });

    // // ❌ WA disconnected
    // this.socketService.onDisconnected().subscribe(() => {
    //   this.ready = false;
    //   this.isConnected = false;
    //   this.authenticated = false;
    //   this.syncing = false;
    //   this.alert.error('WhatsApp disconnected');
    // });

    this.socketService.Qr().subscribe(qr => {
      this.lastQr = qr;
      this.qrCode = qr;
      this.isLoading = false;
      this.showWhatsappModal = true;
      // this.connected = false;
    });

    this.socketService.Authen().subscribe(() => {
      this.qrCode = null;
      this.lastQr = null;
      this.isLoading = false;
      this.showWhatsappModal = false;
      this.isConnected = true;
    });
    
    this.socketService.eroor().subscribe((msg: string) => {
      this.alert.error(`WhatsApp Error: ${msg}`);
      this.isLoading = false;
      this.showWhatsappModal = false;
      this.lastQr = null;
    });
  }

  // -------------------- CONNECT / DISCONNECT --------------------
  connectWhatsapp() {
    if (this.isConnected) {
      // this.openDisconnectModal();
      return;
    }

    if (this.lastQr) {
      console.log("INSIDE last QR",this.lastQr)
        this.showWhatsappModal = true;
        this.isLoading = false;
        this.qrCode = this.lastQr;
        return;
    }

    this.isLoading = true;
    this.showWhatsappModal = true;

    if (this.modalTimeoutId) clearTimeout(this.modalTimeoutId);

    this.modalTimeoutId = setTimeout(() => {
      this.isLoading = false;
      this.showWhatsappModal = false;
      this.modalTimeoutId = null;
    }, 100000);

    this.service.connectToWhatsApp(this.currentUserId, (res: any) => {
      if (res?.status === 200) {
        if (res.qr) {
          this.qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(res.qr)}`;
        }
      } else {
        this.isLoading = false;
        this.alert.error(res?.message || 'Failed to connect WhatsApp');
      }
    });
  }

  openDisconnectModal() {
    this.disconnectModal = true;
  }

  disconnectWhatsApp() {
    if (this.isLoading) return;

    this.isLoading = true;

    this.service.disconnectWhatsApp(this.currentUserId, (res: any) => {
      this.isLoading = false;
      if (res?.status === 200) {
        this.alert.success(res.message);
        this.isConnected = false;
        this.ready = false;
        this.authenticated = false;
        this.syncing = false;
        this.disconnectModal = false;
      } else {
        this.alert.error(res?.message || 'Failed to disconnect');
      }
    });
  }

  // -------------------- USER DATA --------------------
  getUserDataCurrentId() {
    this.service.getUsersByCurrentId(this.currentUserId, (res: any) => {
      localStorage.setItem('userData', JSON.stringify(res));
      this.userData = res;

      if (res?.whatsapp_status === 'ready') {
        this.isConnected = true;
        this.ready = true;
      }

      this.userForm.patchValue(res);
    });
  }

  // -------------------- PROFILE --------------------
  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (!this.userForm.valid) {
      Object.keys(this.userForm.controls).forEach(key => {
        this.userForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;

    this.service.updateProfile(
      { ...this.userForm.value, id: this.currentUserId },
      (res: any) => {
        this.isSubmitting = false;
        if (res?.status === 200) {
          this.alert.success(res.message);
          this.getUserDataCurrentId();
          this.router.navigate(['dashboard']);
        } else {
          this.alert.error(res?.message || 'Update failed');
        }
      }
    );
  }

  // -------------------- IMAGE UPLOAD --------------------
  onImgUpload(event: any) {
    this.iconLoader = true;

    const file = event.target.files[0];
    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onload = async () => {
      const compressedImage = reader.result as string;
      const blob = this.dataURLtoBlob(compressedImage);

      const fileRef = ref(
        this.storage,
        `studio-icon/${this.userForm.value.studio_name.split(' ').join('_')}/${this.currentUserId}`
      );

      const uploadTask = uploadBytesResumable(fileRef, blob);

      uploadTask.then(async () => {
        const url = await getDownloadURL(fileRef);
        this.iconLoader = false;
        this.userForm.patchValue({ studio_icon: url });
      });
    };
  }

  dataURLtoBlob(dataURL: string) {
    const byteString = atob(dataURL.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }

  // -------------------- LOGOUT --------------------
  showLogOutModal = false;

  toggleLogoutModal() {
    this.showLogOutModal = !this.showLogOutModal;
  }

  logout() {
    this.showLogOutModal = false;
    localStorage.clear();
    this.alert.success('Logout Successfully');
    this.router.navigate(['/login']);
  }

  ngOnDestroy() {
  }
}
