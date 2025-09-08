import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../services/admin.service';
import { AlertService } from '../../../services/alert.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval } from 'rxjs';
import { Router } from '@angular/router';


@Component({
  selector: 'app-customer-request',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './customer-request.component.html',
  styleUrl: './customer-request.component.scss'
})
export class CustomerRequestComponent {

  stats: any;
  todayDate: any = new Date();
  isModalOpen: boolean = false;
  users: any = [];
  deleteModal: boolean = false;
  id: Number = 0;
  searchTerm: any = '';
  filteredItems: any = [];
  currentUser: any = {};


  constructor(
    private service: AdminService,
    private alert: AlertService,
    private router: Router
  ) { }



  ngOnInit() {
    this.getRealTime();
    this.getAllFeatures()
  }

  getAllFeatures() {
    this.service.getAllRequests((res: any) => {
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

  searchCustomers() {
    if (!this.searchTerm) {
      this.filteredItems = [...this.users];
      return;
    }
    this.filteredItems = this.users.filter((item: any) =>
      item.customer_name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }
  viewDetails(user: any) {
    this.id = user.ticket_id;
    console.log(user);
    
    this.currentUser = user;
    this.deleteModal = true;
  }

  onClose() {
    this.deleteModal = false;

  }

  markAsResolved() {
    this.service.markAsResolvedByStatus(this.id, (res: any) => {
      if (res.status == 200) {
        this.alert.success(res.message);
        this.onClose();
        this.getAllFeatures();
      } else {
        this.alert.error(res.message);
      }
    })

  }

  onEdit(id: any) {
    this.router.navigate(['admin/edit-customer', id])
  }
}
