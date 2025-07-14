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
  tempStudioIcon:any='';

  constructor(private fb: FormBuilder, private service: AdminService, private alert: AlertService, private route: ActivatedRoute, private router: Router) {
    this.userForm = this.fb.group({
      studio_name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone_number: ['', [Validators.required]],
      address: ['', [Validators.required]],
      terms_and_condition: ['', [Validators.required]],
      studio_icon:['',Validators.required],
      youtube_url:['',Validators.required],
      instagram_url:['',Validators.required],
      facebook_url:['',Validators.required],
    });
  }

  ngOnInit() {
    this.currentUserId = JSON.parse(<any>localStorage.getItem("currentUserId"));
    this.service.getUsersByCurrentId(this.currentUserId, (res: any) => {
      localStorage.setItem("user_data",JSON.stringify(res));
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
          this.alert.success(res.message)
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
  getRealTime() {
    interval(1000).subscribe(() => {
      this.todayDate = new Date();
    })
  }

  onImgUpload(event: any) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onload = async () => {
      let compressedImage = reader.result as string;
      let blob = this.dataURLtoBlob(compressedImage);
      const fileRef = ref(this.storage, `studio-image/${this.userForm.value.studio_name.split(" ").join("_")}`);
      const uploadTask = uploadBytesResumable(fileRef, blob);
      
      uploadTask.then(async () => {
        const url = await getDownloadURL(fileRef);
        console.log(url,"dsadad");
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


}
