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
  isModalOpen: boolean = false;
  isEdit: boolean = false;
  users: any = [];
  deleteModal: boolean = false;
  id:Number=0;
  searchTerm:any='';
  filteredItems:any=[];


  constructor(
    private router: Router,
    private service: AdminService,
    private alert: AlertService
  ) { }

  ngOnInit() {
    // this.loadDashboardStats();
    this.getRealTime();
    this.getAllUsers()
  }

  getAllUsers() {
    this.service.getAllUsers((res: any) => {
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

  addUsers() {
    this.router.navigate(['admin/add-user'])
  }

  searchUsers() {
      if (!this.searchTerm) {
        this.filteredItems = [...this.users]; 
        return;
      }
      this.filteredItems = this.users.filter((item:any) =>
        item.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );

  }

  onEdit(user: any) {
  this.router.navigate(['admin/edit-user', user.id])
  
  }

  onDeleteModal(user: any) {
    console.log(user.id);

    this.id = user.id
    
  this.deleteModal=true;
  }

  onClose() {
    this.deleteModal=false;

  }

  onDelete() {
    this.service.deleteUsers(this.id, (res: any) => {
      if (res.status == 200) {
        this.alert.success(res.message);
        this.onClose();
        this.getAllUsers();
      }
    })

  }  
  }




