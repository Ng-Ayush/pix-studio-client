import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { FileService } from '../../services/file.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
declare var window: any;
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
    },
  };

  dataLabels: any = {
    enabled: true,
    style: { colors: ['#fff'], fontSize: '14px', fontWeight: 'bold' },
  }

  colors = ['#ffe7ff'];

  xAxis: ApexXAxis = {
    labels: { style: { colors: '#fff', fontSize: '15px' } }
  };

  yAxis: ApexYAxis = {
    labels: { style: { colors: '#fff', fontSize: '15px' } }
  }

  currentUserId: any = -1;
  showLogOutModal: boolean = false;
  showUnderConstructionModal: boolean = false;
  userData: any = {};
  dynamicImages: any = [];
  days: number = 0;
  hours: number = 0;
  minutes: number = 0;
  seconds: number = 0;
  timeUp: boolean = false;
  timerRunning: boolean = false;

  private timerInterval: any;

  constructor(
    private fileService: FileService,
    private router: Router,
    private _service: AdminService,
    public commonservice: CommonService,
    private alert: AlertService
  ) {
    this.userData = JSON.parse(<any>localStorage.getItem("userData"));
  }

  ngOnInit() {
    this.loadDashboardStats();
    this.loadDynamicIamgeUrl();
  }

  loadDynamicIamgeUrl() {
    this._service.getDynamicImageUrl((res: any) => {
      if (res.status == 200) {
        this.dynamicImages = res.data;
      }

    })
  }

  loadDashboardStats() {
    this._service.fetchSalesAndPendingGraphData({ range: this.granularity }, (res: any) => {
      if (res.status == 200) {
        const sales = res.sales.map((x: any) => x.amount);
        const estimates = res.estimates.map((x: any) => x.amount);
        const categories = res.sales.map((x: any) => this.commonservice.formatDate(x.period));
        this.salesSeries = [{ name: 'Sales', data: sales }];
        this.estimateSeries = [{ name: 'Estimates', data: estimates }];
        // this.xAxis = { categories };

      }
    });
  }

  toggleLogoutModal() {
    this.showLogOutModal = !this.showLogOutModal;
  }

  logout() {
    this.showLogOutModal = false;
    localStorage.clear();
    this.alert.success('Logout Successfully');
    if (window && window?.electronAPI) {
      window.electronAPI.logout();
    }
    this.router.navigate(['/login']);
  }

  ngAfterViewInit() {
    const carousel: any = document.getElementById('carousel');
    let idx = 0;
    const total = 3;

    setInterval(() => {
      idx = (idx + 1) % total;
      carousel.style.transform = `translateX(-${idx * 100}%)`;
    }, 2000);
  }

  underConstruction() {
    this.showUnderConstructionModal = true;
    this.startCountdown();
  }

  startCountdown() {
  if (this.timerRunning) {
    return; // prevent multiple starts
  }

  this.timeUp = false;
  this.timerRunning = true;

  // Set countdown target to NEXT Wednesday midnight (00:00)
  const now = new Date();
  const day = now.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6

  // Calculate days until NEXT Wednesday
  let daysUntilWednesday = (3 - day + 7) % 7; // 3 = Wednesday
  if (daysUntilWednesday === 0) {
    // If today *is* Wednesday, move to the next one (next week)
    daysUntilWednesday = 7;
  }

  const countdownTarget = new Date(now);
  countdownTarget.setDate(now.getDate() + daysUntilWednesday);
  countdownTarget.setHours(0, 0, 0, 0);

  this.updateCountdown(countdownTarget);
  this.timerInterval = setInterval(() => this.updateCountdown(countdownTarget), 1000);
}

  private updateCountdown(target: Date) {
    const now = new Date().getTime();
    const targetTime = target.getTime();
    const diff = targetTime - now;

    if (diff <= 0) {
      this.timeUp = true;
      this.timerRunning = false;
      clearInterval(this.timerInterval);

      this.onCountdownComplete();

      return;
    }

    this.days = Math.floor(diff / (1000 * 60 * 60 * 24));
    this.hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    this.minutes = Math.floor((diff / (1000 * 60)) % 60);
    this.seconds = Math.floor((diff / 1000) % 60);
  }

  private onCountdownComplete() {
    // Call your required methods here when countdown ends
    console.log('Countdown reached zero! Execute your logic.');
    // Example:
    // this.someMethod();
    // this.anotherMethod();
  }

  ngOnDestroy() {
    clearInterval(this.timerInterval);
  }

}
