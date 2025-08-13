import { Component } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoaderService } from '../../shared/loader.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-calling',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './calling.component.html',
  styleUrl: './calling.component.scss'
})
export class CallingComponent {

  todayDate: any = new Date();
  userData: any = {};
  agentConfig: any = {};
  agentList: any = [];
  filteredAgents: any = [];
  agentModal: boolean = false;
  showLogOutModal: boolean = false;
  constructor(private adminService: AdminService, private loader: LoaderService, private alert: AlertService,private router:Router) {
    this.getUserData();
    this.getAgentList();
  }


  getAgentList() {
    this.loader.show();
    this.adminService.getAgents((res: any) => {
      if (res.status == 200) {
        this.agentList = res.data;
        this.filteredAgents = [...this.agentList];
        this.loader.hide();
      } else {
        this.loader.hide();
      }
    })

  }

  getUserData() {
    this.adminService.getUsersByCurrentId(JSON.parse(<any>localStorage.getItem("currentUserId")), (res: any) => {
      console.log(res);
      this.userData = res;
    })
  }

  search(event: any) {
    if (event.target.value == '') {
      this.filteredAgents = [...this.agentList];
    } else {
      this.filteredAgents = this.agentList.filter((item: any) => item.agent_name.toLowerCase().includes(event.target.value.toLowerCase()));
    }
  }

  openModal() {
    this.agentModal = true;
  }

  closeModal() {
    this.agentModal = false;
  }

  copyAgentPhone(agent: any) {
    const message = agent.agent_phone;
    navigator.clipboard.writeText(message).then(() => {
      this.alert.success('Agent Phone copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy message: ', err);
    });
  }

  createAgent() {
    this.loader.show();
    if (!this.agentConfig.agentName || !this.agentConfig.agentPhone) {
      this.loader.hide();
      this.alert.error('Please fill all the fields');
      return;
    }
    this.adminService.createAgent(this.agentConfig, (res: any) => {
      if (res.status == 200) {
        this.loader.hide();
        this.alert.success(res.message);
        this.getAgentList();
        this.closeModal();
      } else {
        this.alert.error(res.message);
        this.loader.hide();
      }
    })
  }

  toggleLogoutModal() {
    this.showLogOutModal = !this.showLogOutModal;
  }

    logout() {
    this.showLogOutModal = false;
    localStorage.clear();
    this.alert.success('Logout Successfully');
    this.router.navigate(['/login']);
  }


}
