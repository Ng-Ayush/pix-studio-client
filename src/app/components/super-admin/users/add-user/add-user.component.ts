import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../../../services/admin.service';
import { AlertService } from '../../../../services/alert.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { interval } from 'rxjs';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
import { CommonService } from '../../../../services/common.service';

@Component({
  selector: 'app-add-user',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, FormsModule],
  templateUrl: './add-user.component.html',
  styleUrl: './add-user.component.scss'
})
export class AddUserComponent {

  userForm: FormGroup|any;
  showPassword = false;
  isSubmitting = false;
  itemId: any;
  todayDate: any = new Date();
  searchTerm: any = '';
  storage = inject(Storage);

  constructor(private fb: FormBuilder, private service: AdminService, private alert: AlertService, private route: ActivatedRoute, private router: Router,private common:CommonService) {
    this.userForm = this.fb.group({
      studio_name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone_number: ['', [Validators.required]],
      role: ['',],
      studio_icon: ['', Validators.required],
      youtube_url: ['', Validators.required],
      instagram_url: ['', Validators.required],
      facebook_url: ['', Validators.required],
      address: ['', Validators.required],
      access_expires_on: ['', Validators.required],
      allowed_photos_quantity: [100, Validators.required],
    });
    this.itemId = this.route.snapshot.paramMap.get('id');
    if (this.itemId) {
      this.fetchUsersById();
    }
    this.getRealTime();
  }

  fetchUsersById() {
    this.service.getUsersById(this.itemId, (res: any) => {
      const data = {...res, access_expires_on: res.access_expires_on ? this.common.formatDate(res.access_expires_on) : ''}
      this.userForm.patchValue(data);
    })

  }

  // togglePassword(): void {
  //   this.showPassword = !this.showPassword;
  // }

  onSubmit(): void {
    if (this.userForm.valid) {
      this.isSubmitting = true;
      if (!this.itemId) {
        this.service.createUsers({ ...this.userForm.value }, (res: any) => {
          if (res.status == 200) {
            this.alert.success(res.message);
            this.userForm.reset();
            this.router.navigate(['admin/users'])
          } else {
            this.alert.error(res.message);
          }
        })
      } else {
        this.service.updateUsers({ ...this.userForm.value, id: this.itemId }, (res: any) => {
          if (res.status == 200) {
            this.alert.success(res.message)
            this.router.navigate(['admin/users'])
          } else {
            this.alert.error(res.message);
          }
        })
      }
      this.isSubmitting = false;
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
       console.log(file);
       
       const fileRef = ref(this.storage, `studio-icon/${file.name}`);
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
