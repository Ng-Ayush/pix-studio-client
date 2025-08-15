import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../../../services/admin.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { interval } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
import { AlertService } from '../../../../services/alert.service';


@Component({
  selector: 'app-add-manage-features',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, FormsModule],
  templateUrl: './add-manage-features.component.html',
  styleUrl: './add-manage-features.component.scss'
})
export class AddManageFeaturesComponent {

  featureForm: FormGroup;
  showPassword = false;
  isSubmitting = false;
  itemId: any;
  todayDate: any = new Date();
  searchTerm: any = '';
  categoryNames: any = [];
  thumbnailLoader: boolean = false;
  storage = inject(Storage);


  constructor(private fb: FormBuilder, private service: AdminService, private alert: AlertService, private route: ActivatedRoute, private router: Router) {
    this.featureForm = this.fb.group({
      title: ['', [Validators.required]],
      category: ['', [Validators.required]],
      price: ['', [Validators.required]],
      youtube_url: ['', [Validators.required]],
      drive_url: ['', [Validators.required]],
      description: ['',],
      is_new_arrival: ['',],
      youtube_thumbnail: ['', [Validators.required]],

    });

    this.itemId = this.route.snapshot.paramMap.get('id');
    if (this.itemId) {
      this.getFeatureById();
    }
  }

  getFeatureById() {
    this.service.getFeatureById(this.itemId, (res: any) => {
      this.featureForm.patchValue(res);
    })

  }

  ngOnInit() {
    this.getAllCategories();
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.featureForm.valid) {
      this.isSubmitting = true;
      if (!this.itemId) {
        this.service.createFeatures({ ...this.featureForm.value }, (res: any) => {
          if (res.status == 200) {
            this.alert.success(res.message);
            this.isSubmitting = false;
            this.router.navigate(['admin/manage-features'])
          } else {

            this.alert.error(res.message);
          }
        })
      } else {
        this.service.updateFeature({ ...this.featureForm.value, id: this.itemId }, (res: any) => {
          if (res.status == 200) {
            this.alert.success(res.message);
            this.featureForm.reset();
            this.isSubmitting = false;
            this.router.navigate(['admin/manage-features'])
          } else {
            this.alert.error(res.message);
          }
        })
      }
    } else {
      this.featureForm.markAllAsTouched();
    }
  }




  getAllCategories() {
    this.service.getAllCategories((res: any) => {
      if (res.status == 200) {
        this.categoryNames = res.data;
      } else {
        this.alert.error(res.message);
      }
    })
  }

  handleFileUpload(event: any) {
    this.thumbnailLoader = true;
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onload = async () => {
      let compressedImage = reader.result as string;
      let blob = this.dataURLtoBlob(compressedImage);
      const fileRef = ref(this.storage, `features/youtube_thumbnails/${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, blob);

      uploadTask.then(async () => {
        const url = await getDownloadURL(fileRef);
        this.thumbnailLoader = false;
        this.featureForm.patchValue({ youtube_thumbnail: url })
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
