import { CommonModule } from '@angular/common';
import { Component, Input, Output, SimpleChanges } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { LoaderService } from '../../../shared/loader.service';
import { BillingService } from '../../../services/billing.service';
import { AlertService } from '../../../services/alert.service';
import { CommonService } from '../../../services/common.service';
import { AdminService } from '../../../services/admin.service';

@Component({
  selector: 'app-billing-calendar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './billing-calendar.component.html',
  styleUrl: './billing-calendar.component.scss'
})
export class BillingCalendarComponent {
  todayDate: any = new Date();
  currentDate: Date = new Date();
  events: any = {};
  monthYear: string = '';
  calendarDays: any[] = [];
  selectedEvent: any = null;
  constructor(private commonService: CommonService, private loader: LoaderService, private _service: BillingService, private router: Router, private alert: AlertService, private _adminService: AdminService) { }


  ngOnInit() {
    this.getCalendarEvents();
    this.selectedEvent = { date: this.formatDate('2025-07-15'), events: this.events['2025-07-15'] || [] };
  }

  getCalendarEvents() {
    this.loader.show();
    this._adminService.getCalendarEvents((response: any) => {
      this.loader.hide();
      if (response.status) {
        this.events = response.data;
        this.renderCalendar();
      }
    });
  }

  renderCalendar() {
    this.monthYear = `${this.getMonthName(this.currentDate.getMonth())} ${this.currentDate.getFullYear()}`;
    this.calendarDays = this.generateCalendarDays();
  }

  generateCalendarDays() {
    const days: any[] = [];
    const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1).getDay();
    const daysInMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0).getDate();

    // Add empty cells for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: '', events: [] });
    }

    // Add days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${this.currentDate.getFullYear()}-${String(this.currentDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ date: i, events: this.events[dateStr] || [] });
    }

    // Fill remaining cells for the grid
    const totalCells = 42; // 6 rows x 7 days
    const remainingCells = totalCells - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({ date: '', events: [] });
    }

    return days;
  }

  showEventDetails(day: any) {
    const dateStr = `${this.currentDate.getFullYear()}-${String(this.currentDate.getMonth() + 1).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`;
    this.selectedEvent = { date: this.formatDate(dateStr),formatedDate:this.commonService.formatDate(dateStr), events: this.events[dateStr] || [] };
    this.calendarDays.forEach((item: any) => {
      item.isSelected =false;
      if(item.date == day.date){
        item.isSelected = true;
      }
    });

    console.log(this.calendarDays);
    
    
  } 

  isToday(day: any) {
    const today = new Date();
    return this.currentDate.getFullYear() === today.getFullYear() &&
      this.currentDate.getMonth() === today.getMonth() &&
      day.date === today.getDate();
  }

  prevMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.renderCalendar();
  }

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.renderCalendar();
  }

  getMonthName(monthIndex: number) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return monthNames[monthIndex];
  }

  formatDate(dateStr: any) {
    const date = new Date(dateStr);
    const options: any = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  getEventColor(index: number) {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    return colors[index % colors.length];
  }

  trackByDay(index: number, item: any) {
    return index;
  }
  trackByIdx(index: number, item: any) {
    return index;
  }

}
