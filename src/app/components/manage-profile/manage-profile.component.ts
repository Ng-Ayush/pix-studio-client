import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { interval } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin.service';
import { AlertService } from '../../services/alert.service';
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
  itemId: any;
  todayDate: any = new Date();
  searchTerm: any = ''
  currentUserId:any=0;  
  
  
  constructor(private fb: FormBuilder, private service: AdminService, private alert: AlertService, private route: ActivatedRoute, private router: Router) {
    this.userForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone_number: ['', [Validators.required]],
      address: ['', [Validators.required]],
      terms_and_condition: ['', [Validators.required]],
    });
  }
  
  ngOnInit() {
    this.currentUserId = JSON.parse(<any>localStorage.getItem("currentUserId"));
    this.service.getUsersByCurrentId(this.currentUserId,(res:any)=>{
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
          this.router.navigate(['dashboard'])
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
    console.log(event.target.files[0]);
    this.service.onImgUpload({ files: event.target.files[0] }, (res: any) => {
      console.log(res);
      this.userForm.patchValue({ category_icon: "https://google.com" })
    })
  }


}
