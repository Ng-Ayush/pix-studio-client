import { CommonModule } from '@angular/common';
import { Component, Input, Output, SimpleChanges } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { LoaderService } from '../../../shared/loader.service';
import { BillingService } from '../../../services/billing.service';
import { AlertService } from '../../../services/alert.service';
import { CommonService } from '../../../services/common.service';

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
  events: any = {
    '2025-07-15': [
      { name: 'Ayush Srivastava', phone: '555-1234', date: '2023-01-15', index: 0 },
      { name: 'Akash Kumar', phone: '555-5678', date: '2023-01-15', index: 1 },
      { name: 'Akash Kumar', phone: '555-5678', date: '2023-01-15', index: 1 },
      { name: 'Akash Kumar', phone: '555-5678', date: '2023-01-15', index: 1 },
      { name: 'Akash Kumar', phone: '555-5678', date: '2023-01-15', index: 1 },
      { name: 'Akash Kumar', phone: '555-5678', date: '2023-01-15', index: 1 },
    ],
    '2025-07-20': [
      { name: 'Doctor Appointment', phone: '555-9012', date: '2023-01-20', index: 0 }
    ],
    '2025-07-25': [
      { name: 'Birthday Party', phone: '555-3456', date: '2023-01-25', index: 0 }
    ],
    '2025-07-10': [
      { name: 'Project Deadline', phone: '555-7890', date: '2023-02-10', index: 0 }
    ]
  };
  monthYear: string = '';
  calendarDays: any[] = [];
  selectedEvent: any = null;
  constructor(private commonService: CommonService, private loader: LoaderService, private _service: BillingService, private router: Router, private alert: AlertService) { }


  ngOnInit() {
    this.renderCalendar();
  this.selectedEvent = { date: this.formatDate('2025-07-15'), events: this.events['2025-07-15'] || [] };
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
    this.selectedEvent = { date: this.formatDate(dateStr), events: this.events[dateStr] || [] };
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

  formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const options:any = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  getEventColor(index: number) {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    return colors[index % colors.length];
  }
}
