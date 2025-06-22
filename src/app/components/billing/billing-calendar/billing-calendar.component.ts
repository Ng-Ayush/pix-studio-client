import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { LoaderService } from '../../../shared/loader.service';
import { BillingService } from '../../../services/billing.service';
import { AlertService } from '../../../services/alert.service';

@Component({
  selector: 'app-billing-calendar',
  standalone: true,
  imports: [CommonModule,RouterModule],
  templateUrl: './billing-calendar.component.html',
  styleUrl: './billing-calendar.component.scss'
})
export class BillingCalendarComponent {
  todayDate:any= new Date();
  constructor(private loader: LoaderService, private _service: BillingService, private router: Router, private alert: AlertService) { }


}
