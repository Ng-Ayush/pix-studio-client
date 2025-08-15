import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { AlertService } from '../../../services/alert.service';

@Component({
  selector: 'app-manage-features',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink ],
  templateUrl: './manage-features.component.html',
  styleUrl: './manage-features.component.scss'
})
export class ManageFeaturesComponent {
  stats: any;
  todayDate: any = new Date();
  isModalOpen: boolean = false;
  featureList: any = [];
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
    this.getRealTime();
    this.getAllFeatures()
  }

  getAllFeatures() {
    this.service.getAllFeatures((res: any) => {
      if (res.status == 200) {
        this.featureList = res.data;
        this.filteredItems = [...this.featureList]; 
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

  addFeature() {
    this.router.navigate(['admin/add-features'])
  }

  searchFeature() {
      if (!this.searchTerm) {
        this.filteredItems = [...this.featureList]; 
        return;
      }
      this.filteredItems = this.featureList.filter((item:any) =>
        item.title.toLowerCase().includes(this.searchTerm.toLowerCase())
      );

  }

  onEdit(user: any) {
  this.router.navigate(['admin/edit-feature', user.id])
  
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
    this.service.deleteFeatures(this.id, (res: any) => {
      if (res.status == 200) {
        this.alert.success(res.message);
        this.onClose();
        this.getAllFeatures();
      }else{
        this.alert.error(res.message);
      }
    })

  }  

  back(){
    this.router.navigate(['/admin/dashboard']);
  }
}
