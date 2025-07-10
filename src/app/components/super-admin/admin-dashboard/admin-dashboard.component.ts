import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FileService } from '../../../services/file.service';
import { interval } from 'rxjs';
import { Router } from '@angular/router';



@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent {
  stats: any;
  todayDate: any = new Date();

  constructor(
    private fileService: FileService,
    private router: Router
  ) { }

  ngOnInit() {
    // this.loadDashboardStats();
    this.getRealTime();
  }

  getRealTime() {
    interval(1000).subscribe(() => {
      this.todayDate = new Date();
    })
  }

  loadDashboardStats() {
    this.fileService.getDashboardStats((res: any) => {
      this.stats = res;
    })
  }

  logout() {
    // TODO: Implement logout in AuthService
    this.router.navigate(['admin/login']);
  }
}
