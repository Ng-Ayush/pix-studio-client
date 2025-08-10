import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BillingService } from '../../services/billing.service';
import { LoaderService } from '../../shared/loader.service';
import { AlertService } from '../../services/alert.service';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './billing.component.html',
  styleUrl: './billing.component.scss'
})
export class BillingComponent {
  todayDate: any = new Date();
  partyModal: boolean = false;
  activeTab: string = 'address';
  tabs = [
    { id: 'address', name: 'Address', isNew: false },
    // { id: 'creditBalance', name: 'Credit & Balance', isNew: true },
    // { id: 'additionalFields', name: 'Additional Fields', isNew: false },
  ];

  partyConfig: any = { shipping_address: '' };
  partyList: any = [];
  partyInvoiceList: any = [];
  isEdit:boolean=false;
  deleteModal:boolean=false;
  totalSales:any=0;
  totalRemaining:any=0;
  userData:any={};
  fiteredPartyList:any= [];
  constructor(private billingService: BillingService, private loader: LoaderService,private router:Router,private alert:AlertService,private adminService:AdminService) {
  
    this.getUserData();
  }

  ngOnInit() {
    this.fetchPartyList();
  }

   getUserData() {
    this.adminService.getUsersByCurrentId(JSON.parse(<any>localStorage.getItem("currentUserId")), (res: any) => {
      console.log(res);
      this.userData = res;
    })
  }


  fetchPartyList() {
    this.loader.show();
    this.billingService.getAllParty((res: any) => {
      if (res.status == 200 && res.data.length>0) {
        this.loader.hide();
        this.partyList = res.data;
        this.fiteredPartyList = [...this.partyList];
        this.calculateTotalAndRemainingSales();
        this.selectParty(this.partyList[0]);
      } else {
        this.loader.hide();
      }
    })
  }

  openModal() {
    this.partyModal = true;
    this.partyConfig = {};
  }

  closeModal() {
    this.partyModal = false;
    this.isEdit = false;

  }

  saveParty() {
    this.loader.show();
    console.log(this.partyConfig);
    
    if(!this.partyConfig.party_name || !this.partyConfig.phone_number){
      this.loader.hide();
      this.alert.error('Party name and phone number is required');
      return;
    }
    this.billingService.createParty(this.partyConfig, (res: any) => {
      if (res.status == 200) {
        this.alert.success(res.message);
        this.loader.hide();
        this.closeModal();
        this.fetchPartyList();
      } else {
        this.alert.error(res.message);
        this.loader.hide();
      }
    })

  }

  saveAndNewParty() {
    this.loader.show();
     if(!this.partyConfig.party_name || !this.partyConfig.phone_number){
      this.loader.hide();
      this.alert.error('Party name and phone number is required');
      return;
    }
    this.billingService.createParty(this.partyConfig, (res: any) => {
      if (res.status == 200) {
        console.log(res);
        this.alert.success(res.message);
        this.loader.hide();
        this.partyConfig = {};
      }else{
        this.alert.error(res.message);
        this.loader.hide();
      }
    })
  }


  editParty(party:any){
    this.partyModal = true;
    this.isEdit = true;
    this.partyConfig = party;
    console.log(party);
    
  }

  updateParty(){
      this.loader.show();
      const params:any={
        party_name: this.partyConfig.party_name,
        phone_number: this.partyConfig.phone_number,
        email: this.partyConfig.email,
        billing_address: this.partyConfig.billing_address,
      }
      this.billingService.updateParty(this.partyConfig.id, params, (res: any) => {
        if (res.status == 200) {
          this.loader.hide();
          this.alert.success(res.message);
          this.isEdit = false;
          this.closeModal();
        }else{
          this.loader.hide();
          this.alert.error(res.message);

        }
      })
  }

  toggleDeleteModal(){
    this.deleteModal = true;
  }

  deleteParty(){
    this.loader.show();
    this.billingService.deleteParty(this.partyConfig.id, (res: any) => {
      if (res.status == 200) {
        this.loader.hide();
        this.deleteModal = false;
        this.closeModal();
        this.fetchPartyList();
      }else{
        this.loader.hide();
      }
    })
  }

  selectParty(party:any){
    this.loader.show();
    this.partyList.forEach((item:any)=>item.selected=false)
    party.selected = !party.selected;
    this.billingService.getInvoiceByPartyId(party.id, (res: any) => {
      if (res.status == 200) {
        this.loader.hide();
        this.partyConfig = party;
        this.partyInvoiceList = res.data;
      }else{
        this.loader.hide();
      }
    })
  }

  openInvoice(item:any){
    this.router.navigate(['/billing/edit-bill'],{queryParams:{invoice_number:item.invoice_number}});
  }
  
  calculateTotalAndRemainingSales(){
    this.totalSales = 0;
    this.totalRemaining =0;
    this.partyList.forEach((item:any)=>{
      console.log(3232);
      if(item.invoice_type == 'sale'){
        this.totalSales = this.totalSales + +item.total;  
        this.totalRemaining = this.totalRemaining + +item.balance_left;
      }
    })
  }

  search(event: any) {
    if (event.target.value == '') {
      this.fiteredPartyList = [...this.partyList];
    } else {
      this.fiteredPartyList = this.partyList.filter((item: any) => item.phone_number.toLowerCase().includes(event.target.value.toLowerCase()) ||(item.party_name.toLowerCase().includes(event.target.value.toLowerCase())));
    }
  }
}
