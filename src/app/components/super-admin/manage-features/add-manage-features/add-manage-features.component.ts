import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../../../services/admin.service';
import { AlertService } from '../../../../services/alert.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { interval } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-add-manage-features',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, FormsModule],
  templateUrl: './add-manage-features.component.html',
  styleUrl: './add-manage-features.component.scss'
})
export class AddManageFeaturesComponent {

  userForm: FormGroup;
  showPassword = false;
  isSubmitting = false;
  itemId: any;
  todayDate: any = new Date();
  searchTerm: any = '';
  categoryNames:any=[];


  constructor(private fb: FormBuilder, private service: AdminService, private alert: AlertService, private route: ActivatedRoute, private router: Router) {
    this.userForm = this.fb.group({
      title: ['', [Validators.required]],
      category: ['', [Validators.required]],
      price: ['', [Validators.required]],
      youtube_url: ['', [Validators.required]],
      drive_url: ['', [Validators.required]],
      description: ['',],
      is_new_arrival: ['',],
    });
  
    this.itemId = this.route.snapshot.paramMap.get('id');
    if (this.itemId) {
      this.getFeatureById();
    }
  }

  getFeatureById() {
    this.service.getFeatureById(this.itemId, (res: any) => {
      this.userForm.patchValue(res);
    })

  }

  ngOnInit() {
    this.getAllCategories();
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      this.isSubmitting = true;
      if (!this.itemId) {
        this.service.createFeatures({ ...this.userForm.value }, (res: any) => {
          if (res.status == 200) {
            this.alert.success(res.message);
            this.isSubmitting = false;
            this.router.navigate(['admin/manage-features'])
          } else {

            this.alert.error(res.message);
          }
        })
      } else {
        this.service.updateFeature({ ...this.userForm.value, id: this.itemId }, (res: any) => {
          if (res.status == 200) {
            this.alert.success(res.message);
            this.userForm.reset();
            this.isSubmitting = false;
            this.router.navigate(['admin/manage-features'])
          } else {
            this.alert.error(res.message);
          }
        })
      }
    } else {
      this.userForm.markAllAsTouched();
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

}
