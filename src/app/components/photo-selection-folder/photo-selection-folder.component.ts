import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { PhotoSelectionService } from '../../services/photo-selection.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-photo-selection-folder',
  standalone: true,
  imports: [RouterModule,CommonModule,FormsModule],
  templateUrl: './photo-selection-folder.component.html',
  styleUrl: './photo-selection-folder.component.scss'
})
export class PhotoSelectionFolderComponent {

  todayDate:any= new Date();
  folders: any[] = [];
  showModal = false;
  newFolderName = '';
  currentEventId:number= -1;
  isEdit:boolean=false;
  currentFolderId:number= -1;
  deleteModal:boolean=false;
  eventName:any='';
  aiGuests:any=[];

  constructor(private service: CustomerService,private _pservice: PhotoSelectionService,private route:ActivatedRoute,private router:Router,private alert:AlertService){
    this.route.params.subscribe(params => {
      if(params['event-id']){
        this.currentEventId = params['event-id'];
        this.fetchFolderByEventId();
        this.fetchAiGuestByEventId();
      }
    })
  }

  fetchFolderByEventId(){
    this._pservice.getFolderByEventId(this.currentEventId,(res:any)=>{
      if(res.status == 200){
        this.folders = res.data;
        this.eventName = res.data[0]?.event_name || '';
      }
    })
  }

  fetchAiGuestByEventId(){
    this._pservice.getAiGuestByEventId(this.currentEventId,(res:any)=>{
      if(res.status == 200){
        this.aiGuests = res.data;
      }
    })
  }
  

  toggleFolderSelection(folder: any): void {
    folder.selected = !folder.selected;
  }
  
  openCreateFolderModal(): void {
    this.newFolderName = '';
    this.showModal = true;
  }
  
  openEditFolderModal(folder: any): void {
    this.newFolderName = folder.folder_name;
    this.showModal = true;
    this.isEdit = true;
    this.currentFolderId = folder.id;
  }

  createNewFolder(){
    const params:any={
      folder_name:"New Folder",
      event_id:this.currentEventId
    }

    this._pservice.createNewFolder(params,(res:any)=>{
      if(res.status == 200){
        this.alert.success("Folder Created");
        this.fetchFolderByEventId();
      }else{
        this.alert.error(res.message);
      }
    })
    
  }
  
  closeModal(): void {
    this.showModal = false;
    this.isEdit = false;
    this.deleteModal = false;
  }
  
  editFolder() {
    const params:any={
      folder_name:this.newFolderName,
      event_id:this.currentEventId,
    }

    this._pservice.updateFolder(params,this.currentFolderId,(res:any)=>{
      if(res.status == 200){
        this.alert.success("Folder Updated");
        this.closeModal();
        this.fetchFolderByEventId();
      }else{
        this.alert.error(res.message);
      }
    })
  }

  toggleDeleteModal(id:any){
    this.deleteModal = true;
    this.currentFolderId = id;
  }

  deleteFolder(){
    this._pservice.deleteFolder(this.currentFolderId,(res:any)=>{
      if(res.status == 200){
        this.alert.success("Folder Deleted");
        this.closeModal();
        this.fetchFolderByEventId();
      }else{
        this.alert.error(res.message);
      }
    })
  }

  backToEvents(){
    this.router.navigate(['/photo-selection']);
  }

  openFolder(folder:any){
    this.router.navigate(['/photo-selection-photos',folder.id]);
    
  }
  

}
