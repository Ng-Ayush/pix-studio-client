import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { FileService } from '../../services/file.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { interval } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  stats: any;
  todayDate:any= new Date();

  constructor(
    private fileService: FileService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadDashboardStats();
    this.getRealTime();
  }

  getRealTime(){
    interval(1000).subscribe(() => {
      this.todayDate = new Date();
    })
  }

  loadDashboardStats() {
    this.fileService.getDashboardStats((res:any)=>{
      this.stats = res;
    })
  }

  logout() {
    // TODO: Implement logout in AuthService
    this.router.navigate(['/login']);
  }
}
