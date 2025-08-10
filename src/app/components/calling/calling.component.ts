import { Component } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-calling',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './calling.component.html',
  styleUrl: './calling.component.scss'
})
export class CallingComponent {

  todayDate: any = new Date();
  userData:any={};
  constructor(private adminService:AdminService) {
    this.getUserData();
  }

  ngOnInit() {
  }

   getUserData() {
    this.adminService.getUsersByCurrentId(JSON.parse(<any>localStorage.getItem("currentUserId")), (res: any) => {
      console.log(res);
      this.userData = res;
    })
  }


}
