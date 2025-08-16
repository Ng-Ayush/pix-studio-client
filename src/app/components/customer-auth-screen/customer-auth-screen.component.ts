import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { AlertService } from '../../services/alert.service';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-customer-auth-screen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-auth-screen.component.html',
  styleUrl: './customer-auth-screen.component.scss'
})
export class CustomerAuthScreenComponent {

  uniqueCode: any = null;
  loader: boolean = false;
  userData: any = {};
  userId: any = '';

  constructor(private router: Router, private customerService: CustomerService, private admin: AdminService, private alert: AlertService, private route: ActivatedRoute) {
    this.route.queryParams.subscribe((params: any) => {
      if (params['studio-id']) {
        this.userId = params['studio-id'];
        this.getUserData();
      }
    })
  }

  getUserData() {
    this.admin.getUsersByCurrentId(this.userId, (res: any) => {
      this.userData = res;
    })
  }


  verifyCode() {
    this.loader = true;
    this.customerService.verifyUniqueCode({ code: this.uniqueCode }, (res: any) => {
      if (res.status == 200 && !res.is_event_submitted) {
        this.loader = false;
        localStorage.setItem("uniqueCode", this.uniqueCode);
        localStorage.setItem("userData", JSON.stringify(this.userData));
        this.router.navigate(['/selection/folder-listing-screen']);
      } else if (res.is_event_submitted) {
        this.loader = false;
        this.alert.info("Event already submitted");
      }else{
        this.loader = false;
        this.alert.error(res.message);
      }
    })
  }

  checkMaxLength(event: any) {
    let val = event.target.value.replace(/\D/g, ''); // Remove non-digits
    if (val.length > 5) val = val.substring(0, 6);
    event.target.value = val;
    this.uniqueCode = val;
  }

}
