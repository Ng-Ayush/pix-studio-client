import { Component } from '@angular/core';
import { AlertService } from '../../services/alert.service';
import { AdminService } from '../../services/admin.service';
import { PhotoSelectionService } from '../../services/photo-selection.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { interval } from 'rxjs';

@Component({
  selector: 'app-ai-photo-sharing',
  standalone: true,
  imports: [RouterModule,CommonModule],
  templateUrl: './ai-photo-sharing.component.html',
  styleUrl: './ai-photo-sharing.component.scss'
})
export class AiPhotoSharingComponent {

  todayDate:any = new Date();
  eventList: any = [];
  filteredEvents:any=[];
  constructor(
    private alert:AlertService,
    private _service:AdminService,
    private router:Router,
    private eventService:PhotoSelectionService
  ){}

  ngOnInit(){
     interval(1000).subscribe(() => {
          this.todayDate = new Date();
        });
        this.getAllEvents();
  }

   getAllEvents() {
    this.eventService.getAllEvents((res: any) => {
      if (res.status == 200) {
        this.eventList = res.data;
        this.filteredEvents = [...this.eventList];
      }
    })
  }


  openModal(){

  }

  search(event:any){

  }

  editModal(a:any){

  }

  toggleDeleteModal(as:any){

  }

  toggleEventStatus(event:any){

  }

  copyMessage(event:any){

  }

  goToPhotoSelection(event:any){

  }
}
