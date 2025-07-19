import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { FileService } from '../../services/file.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { interval } from 'rxjs';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis
} from 'ng-apexcharts';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { CommonService } from '../../services/common.service';
import { AlertService } from '../../services/alert.service';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgApexchartsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  stats: any;
  todayDate: any = new Date();
  granularity: string = 'daily';

  salesSeries: ApexAxisChartSeries = [
    { name: 'Sales', data: [] }
  ];

  estimateSeries: ApexAxisChartSeries = [
    { name: 'Estimates', data: [] }
  ];

  chartOptions: ApexChart = {
    type: 'bar',
    height: 350,
    toolbar: {
    show: false
  }
  };

  xAxis: ApexXAxis = {
    categories: []
  };
  currentUserId:any=-1;
  showLogOutModal:boolean=false;
  constructor(
    private fileService: FileService,
    private router: Router,
    private _service: AdminService,
    public commonservice:CommonService,
    private alert:AlertService
  ) { }

  ngOnInit() {
    this.getAdminUserData();
    this.loadDashboardStats();
    this.getRealTime();
  }

  getAdminUserData(){
     this.currentUserId = JSON.parse(<any>localStorage.getItem("currentUserId"));
      this._service.getUsersByCurrentId(this.currentUserId, (res: any) => {
      this.commonservice.adminUserData = res;
      console.log(res);
      
    })
  }

  getRealTime() {
    interval(1000).subscribe(() => {
      this.todayDate = new Date();
    })
  }


  loadDashboardStats() {
    this._service.fetchSalesAndPendingGraphData({ range: this.granularity }, (res: any) => {
      const sales = res.sales.map((x: any) => x.amount);
      const estimates = res.estimates.map((x: any) => x.amount);
      const categories = res.sales.map((x: any) => this.commonservice.formatDate(x.period));

      this.salesSeries = [{ name: 'Sales', data: sales }];
      this.estimateSeries = [{ name: 'Estimates', data: estimates }];
      this.xAxis = { categories };
    });
  }

  toggleLogoutModal(){
    this.showLogOutModal = !this.showLogOutModal;
  }

  logout(){
    this.showLogOutModal = false;
    localStorage.clear();
    this.alert.success('Logout Successfully');
    this.router.navigate(['/login']);
  }
}
