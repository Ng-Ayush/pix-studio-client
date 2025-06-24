import { CommonModule } from '@angular/common';
import { Component, Input, Output, SimpleChanges } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { LoaderService } from '../../../shared/loader.service';
import { BillingService } from '../../../services/billing.service';
import { AlertService } from '../../../services/alert.service';
import { of } from 'rxjs';
import { CalendarComponent } from '../../../shared/calendar/calendar.component';
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
  @Input() bookings: any[] = [];

  currentMonth: Date = new Date();
  days: (Date | null)[] = [];
  weekdays: string[] = ['SUN', 'MON', 'THU', 'WED', 'FRI', 'SAT']; // Corrected order
  selectedDate: string | null = null;
  bookingDates: Set<string> = new Set();
  title = 'my-booking-app';
  // selectedDate: string | null = null;
  bookingsForSelectedDate$: any = of([]);
  allBookings: any[] = [];
  constructor(private commonService: CommonService, private loader: LoaderService, private _service: BillingService, private router: Router, private alert: AlertService) { }


  ngOnInit(): void {
    this.generateCalendar();
    this.selectedDate = this.formatDate(new Date());
    this.fetchBookingsForSelectedDate(this.selectedDate);

  }

  // ngOnChanges(changes: SimpleChanges): void {
  //   if (changes['bookings'] && this.allBookings) {
  //     this.bookingDates.clear();
  //     this.allBookings.forEach(booking => this.bookingDates.add(booking.date));
  //     this.generateCalendar(); // Re-generate calendar to show booking indicators
  //   }
  // }

  generateCalendar(): void {
    this.days = [];
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const numDaysInMonth = lastDayOfMonth.getDate();

    // Fill leading empty days
    const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday, 1 for Monday, etc.
    for (let i = 0; i < firstDayOfWeek; i++) {
      this.days.push(null);
    }

    // Fill days of the month
    for (let i = 1; i <= numDaysInMonth; i++) {
      this.days.push(new Date(year, month, i));
    }

    // Optionally fill trailing empty days to complete the last week
    const totalCells = this.days.length;
    const remainingCells = 42 - totalCells; // 6 weeks * 7 days/week = 42 cells
    for (let i = 0; i < remainingCells; i++) {
      this.days.push(null);
    }
  }

  prevMonth(): void {
    let currentMonth: any = this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
    currentMonth = new Date(currentMonth);
    this.currentMonth = currentMonth;
    this.generateCalendar();
  }

  nextMonth(): void {
    let currentMonth: any = this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
    currentMonth = new Date(currentMonth);
    this.currentMonth = currentMonth;
    this.generateCalendar();
  }

  onDayClick(day: Date | null): void {
    if (day) {
      console.log(day);

      this.selectedDate = this.formatDate(day);
      // this.dateSelected.emit(this.selectedDate);
      this.onDateSelected(this.selectedDate);
    }
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  isToday(day: Date | null): boolean {
    if (!day) return false;
    const today = new Date();
    return day.getDate() === today.getDate() &&
      day.getMonth() === today.getMonth() &&
      day.getFullYear() === today.getFullYear();
  }

  isSelected(day: Date | null): boolean {
    if (!day || !this.selectedDate) return false;
    return this.formatDate(day) === this.selectedDate;
  }

  hasBooking(day: Date | null): boolean {
    if (!day) return false;
    return this.bookingDates.has(this.formatDate(day));
  }

  onDateSelected(date: string): void {
    this.selectedDate = date;
    this.fetchBookingsForSelectedDate(date);
  }

  fetchBookingsForSelectedDate(date: string): void {
    let dateFormat: any = this.commonService.formatDate(date);
    this._service.getBookingsForDate(dateFormat).subscribe((data: any) => {
      this.allBookings = data;
    });
  }

}
