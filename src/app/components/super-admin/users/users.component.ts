import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { interval } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { AlertService } from '../../../services/alert.service';


@Component({
  selector: 'app-users',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent {
  stats: any;
  todayDate: any = new Date();
  users: any = [];
  deleteModal: boolean = false;
  id: Number = 0;
  searchTerm: any = '';
  filteredItems: any = [];
  private searchTimeout: any;
  activeTab: boolean = true; // default active users

  constructor(
    private router: Router,
    private service: AdminService,
    private alert: AlertService
  ) { }

  ngOnInit() {
    // this.loadDashboardStats();
    this.getRealTime();
    this.getAllAdmins()
  }

  getAllAdmins() {
    const status = this.activeTab;
    const params:any = {
      status: status
    }
    this.service.getAllUsers(params,(res: any) => {
      if (res.status == 200) {
        this.users = res.data;
        this.filteredItems = [...this.users];
      } else {
        this.alert.error(res.message);
      }
    })
  }

  getRealTime() {
    interval(1000).subscribe(() => {
      this.todayDate = new Date();
    })
  }

  addAdmins() {
    this.router.navigate(['admin/add-user'])
  }

  onSearchChange() {
  clearTimeout(this.searchTimeout);
  this.searchTimeout = setTimeout(() => {
    this.searchAdmins();
  }, 500); // 300ms debounce
}

  searchAdmins() {
    if (!this.searchTerm) {
      this.filteredItems = [...this.users];
      return;
    }
    this.filteredItems = this.users.filter((item: any) =>
      item.studio_name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
    (item.phone_number && item.phone_number.includes(this.searchTerm))  //
    );

  }

  onEdit(user: any) {
    this.router.navigate(['admin/edit-user', user.id])

  }

  onDeleteModal(user: any) {
    console.log(user.id);

    this.id = user.id

    this.deleteModal = true;
  }

  onClose() {
    this.deleteModal = false;

  }

  onDelete() {
    this.service.deleteUsers(this.id, (res: any) => {
      if (res.status == 200) {
        this.alert.success(res.message);
        this.onClose();
        this.getAllAdmins();
      }
    })

  }

  onImageError(event: any) {
    event.target.src = 'assets/logo.png';
  }

  toggleAdminStatus(user: any) {
    const param: any = {
      status: !user.status
    };

    this.service.toggleAdminStatus(param, user.id, (res: any) => {
      if (res.status == 200) {
        this.alert.success(res.message);
        // this.getAllAdmins();
      } else {
        this.alert.error(res.message);
      }
    })

  }

  trackAdmins(index: any, item: any) {
    return item.id;
  }

  switchTab(status: boolean) {
  if (this.activeTab === status) return;

  this.activeTab = status;
  this.searchTerm = ''; // optional reset

  this.getAllAdmins();
}

}




