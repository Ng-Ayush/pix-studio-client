import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../../services/customer.service';
import { PhotoSelectionService } from '../../services/photo-selection.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-folder-listing-screen',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './folder-listing-screen.component.html',
  styleUrl: './folder-listing-screen.component.scss'
})
export class FolderListingScreenComponent {
  customerName = '';
  eventName = '';
  selectedPhotosCount = 0;
  totalPhotosCount = 0;
  folders: any = [];
  customerUniqueCode: any = '';
  event_id:any= '';
  showModal:boolean=false;
  userData:any={}
  constructor(private _cService: CustomerService,private pservice: PhotoSelectionService,private router:Router) {
    this.userData = JSON.parse(<any>localStorage.getItem("userData"));
    if(!this.userData){
      localStorage.clear();
      this.router.navigate(['/login']);
    }
  }


  ngOnInit(): void {
    this.customerUniqueCode = localStorage.getItem("uniqueCode");
    if (this.customerUniqueCode) {
      this.getFolderListByCustomerCode();
    }
  }

  getFolderListByCustomerCode() {
    this._cService.getFolderListByCustomerCode({ code: this.customerUniqueCode }, (res: any) => {
      this.folders = res.data.folders;
      this.customerName = res.data.customer_name;
      this.eventName = res.data.event_name;
      this.totalPhotosCount = res.data.photo_count;
      this.event_id = res.data.event_id;
      this.selectedPhotosCount = res.data.selectedPhotosCount
    })
  }

  getPhotos(folderId:any) {

    localStorage.setItem("folderId",folderId);
    this.router.navigate(['/selection/image-listing-screen']);
      
  }



  onCancel(){
    this.showModal=false;
  }

  submitEvent(){
      this.pservice.submitEvent({event_id:this.event_id},(res:any)=>{
        if(res.status == 200){
          this.showModal=false;
          this.router.navigate(['/login']);
        }else{
          
        }
      })
  }
}
