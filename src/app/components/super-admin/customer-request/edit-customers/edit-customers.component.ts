import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../../../services/admin.service';
import { AlertService } from '../../../../services/alert.service';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { interval } from 'rxjs';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-edit-customers',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule,RouterLink,FormsModule],
  templateUrl: './edit-customers.component.html',
  styleUrl: './edit-customers.component.scss'
})
export class EditCustomersComponent {

  userForm: FormGroup;
  showPassword = false;
  isSubmitting = false;
  itemId: any;
  todayDate: any = new Date();
  searchTerm:any=''



  constructor(private fb: FormBuilder, private service: AdminService, private alert: AlertService, private route: ActivatedRoute, private router:Router) {
    this.userForm = this.fb.group({
      customer_name: ['', [Validators.required]],
      priority: ['', [Validators.required]],
   
    });
    this.itemId = this.route.snapshot.paramMap.get('id');
    if (this.itemId) {
      this.getFeatureById();
    }
    this.getRealTime();
  }

  getFeatureById() {
    this.service.getRequestById(this.itemId, (res: any) => {
      this.userForm.patchValue(res);
    })

  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.userForm.valid) {
        this.service.updateRequest({ ...this.userForm.value, id: this.itemId }, (res: any) => {
          if (res.status == 200) {
            this.alert.success(res.message)
            this.router.navigate(['admin/manage-features'])
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

}
