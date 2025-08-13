import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LoaderService } from '../../../shared/loader.service';
import { AlertService } from '../../../services/alert.service';
import { BillingService } from '../../../services/billing.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-bill-estimate',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './bill-estimate.component.html',
  styleUrl: './bill-estimate.component.scss'
})
export class BillEstimateComponent {

  estimateList: any = [];
  todayDate: any = new Date();
  showLogOutModal: boolean = false;
  constructor(private loader: LoaderService, private _service: BillingService, private router: Router, private alert: AlertService) { }

  ngOnInit() {
    this.getEstimateList();
  }

  getEstimateList() {
    this._service.getEstimateList((res: any) => {
      if (res.status == 200) {
        this.estimateList = res.data;
      }
    })
  }
  convertToSales(invoiceId: number) {
    this.loader.show();
    this._service.convertToSales(invoiceId, (res: any) => {
      if (res.status == 200) {
        this.alert.success(res.message);
        this.loader.hide();
        this.getEstimateList();
      } else {
        this.loader.hide();
        this.alert.error(res.message);
      }
    })
  }

  viewEstimate(estimateId: number) {
    this.router.navigate(['/billing/e-invoice', estimateId]);
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
} 
