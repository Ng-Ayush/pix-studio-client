import { CommonModule } from '@angular/common';
import { Component, HostListener, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { BillingService } from '../../../services/billing.service';
import { LoaderService } from '../../../shared/loader.service';
import { AlertService } from '../../../services/alert.service';
@Component({
  selector: 'app-new-bill',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './new-bill.component.html',
  styleUrl: './new-bill.component.scss'
})
export class NewBillComponent {
  todayDate: any = new Date();

  totalQuantity: number = 0;
  totalAmount: number = 0;
  subTotal: number = 0;
  discountAmountVal: number = 0;
  balanceAmount: number = 0;
  advanceAmount: number = 0;
  activeTab: string = 'pricing';
  itemType: string = 'product';
  tabs = [
    { id: 'pricing', name: 'Pricing' },
    { id: 'stock', name: 'Stock' },
  ];

  itemModal: boolean = false;
  invoiceConfig: any = { invoice_items: [] };
  partyList: any = [];
  rows = Array(10).fill(0); // simulate 10 rows
  dropdownVisible = false;
  dropdownPosition = { top: 0, left: 0 };
  @ViewChild('inputRef') inputRef: any;
  invoiceItemsList:any=[];
  newItemConfig:any={};
  isEdit:boolean=false;
  isEditInvoice:boolean=false;
  currentItemIdx:any= 0;
  discount_type:any='percentage';
  invoice_number:any=0;
  
  constructor(private fb: FormBuilder, private billingService: BillingService,private loader:LoaderService,private alert:AlertService,private activatedRoute:ActivatedRoute,private router:Router) {
    // this.saleOrderForm = this.fb.group({
    //   party: ['Aanchal Shrivastava (Cr. Limit: 100)', Validators.required],
    //   billingAddress: [''],
    //   phone: [{ value: '999xxxxxx87', disabled: true }],
    //   orderNo: ['8'],
    //   orderDate: ['01/09/2024'],
    //   time: ['03:15 PM'],
    //   dueDate: ['01/09/2024'],
    //   items: this.fb.array([]),
    //   paymentType: ['Cash'],
    //   paymentDescription: [''],
    //   discountValue: [0],
    //   discountType: ['percentage'],
    //   roundOff: [false],
    //   advanceAmount: [0]
    // });
    this.activatedRoute.queryParams.subscribe(params => 
      {
        if(params['invoice_number']){
          this.invoice_number = params['invoice_number'];
          this.getInvoiceDetailByInvoiceNumber();
        }
      });
  }

  ngOnInit(): void {
    this.addItem();
    this.fetchPartyList();
    this.getAllInvoiceItems();
  }

  addItem() {
    this.invoiceConfig.invoice_items.push({
      item_name: '',
      description: '',
      booking_date: '',
      location: '',
      quantity: 0,
      sale_price: 0,
      purchase_price: 0,
      amount: 0,
      item_code: 0,
      item_category: '',
      item_stock: 0
    })
  }

  fetchPartyList() {
    this.billingService.getAllParty((res: any) => {
      if (res.status == 200) {
        this.partyList = res.data;
      }
    })
  }

  getAllInvoiceItems() {
    this.billingService.getAllInvoiceItems((res: any) => {
      if (res.status == 200) {
        this.invoiceItemsList = res.data;
      }
    })
  }

  removeItem(index: any) {
    this.invoiceConfig.invoice_items.splice(index, 1);
    this.calculateTotals();
  }

  showDropdown(event: FocusEvent,idx:any) {
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.dropdownPosition = {
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
    };
    this.dropdownVisible = true;
    this.currentItemIdx = idx;  
    event.stopPropagation();
  }

  @HostListener('document:click', ['$event'])
  handleOutsideClick(event: MouseEvent) {
    const el:any = document.getElementById(`inputRef_${this.currentItemIdx}`)
    const clickedInside = el?.contains(event.target);
    if (!clickedInside) {
      this.dropdownVisible = false;
    }
  }

  toggleItemModal(){
    this.itemModal = true;
  }

  closeModal(){
    this.itemModal=false;
    this.isEdit = false;
  }

  addInvoiceItem(){
    this.loader.show();
    this.billingService.addInvoiceItem(this.newItemConfig,(res:any)=>{
      if(res.status == 200){
        this.alert.success(res.message)
        this.getAllInvoiceItems();
        this.loader.hide();
        this.closeModal();
      }else{
        this.alert.error(res.message)
      }
    })
    
  }

  getInvoiceItemById(id:any){
    this.isEdit =true;
    this.loader.show();
    this.billingService.getInvoiceItemById(id,(res:any)=>{
      if(res.status == 200){
        this.loader.hide();
        this.newItemConfig = res.data;
        this.toggleItemModal();
      }else{
        this.loader.hide();
      }
    })
  }

  updateInvoiceItem(){
    this.loader.show();
    this.billingService.updateInvoiceItem(this.newItemConfig.id,this.newItemConfig,(res:any)=>{
      if(res.status == 200){
        this.loader.hide();
        this.closeModal();
        this.getAllInvoiceItems();
      }else{
        this.loader.hide();
      }
    })
  }

  selectItem(invoiceItem:any){
    this.invoiceConfig.invoice_items[this.currentItemIdx] = invoiceItem;
    this.calculateAmount(invoiceItem);
    // this.addItem();
  }

  calculateAmount(item:any){
    if(item.quantity && item.purchase_price){
      item.amount = item.quantity * item.purchase_price;
    }else{
      item.amount= 0;
    }
    this.calculateTotals();
  }

  calculateTotals(){
    this.totalAmount = 0;
    this.subTotal = 0;
    this.invoiceConfig.invoice_items.forEach((item:any) => {
      this.totalAmount = this.totalAmount + item.amount;
      this.subTotal = this.subTotal + item.amount;
    });
    if(this.discount_type == 'percentage' && this.discountAmountVal){
      this.totalAmount = this.totalAmount - ((this.totalAmount * this.discountAmountVal) / 100);
    }
    this.totalAmount = this.totalAmount - ( this.discountAmountVal || 0);  
    if(this.advanceAmount){
      this.totalAmount = this.totalAmount - this.advanceAmount;
    }
  }

  updateInvoice(){

  }

  generateInvoice(){
    this.loader.show();
    const params:any={
      ...this.invoiceConfig,
      total: +this.subTotal,
      party_id : +this.invoiceConfig.party_id,
      balance_left: +this.totalAmount,
      invoice_type:'sale',
      invoice_items:JSON.stringify(this.invoiceConfig.invoice_items.map((item:any)=>item.id))
    }

    this.billingService.generateInvoice(params,(res:any)=>{
      if(res.status == 200){
        this.loader.hide();
        this.alert.success(res.message);
        this.router.navigate(['/billing']);
      }else{
        this.loader.hide();
        this.alert.error(res.message);
      }
    })
    
  }

  setPhoneNumber(event:any){
      const parsedValue = JSON.parse(event.target.value);
      this.invoiceConfig.party_id = parsedValue.id;
      this.invoiceConfig.phone_number = parsedValue.phone_number;
      
  }

  getInvoiceDetailByInvoiceNumber(){
    this.loader.show();
    this.billingService.getInvoiceDetailByInvoiceNumber(this.invoice_number,(res:any)=>{
      if(res.status == 200){
        this.isEditInvoice = true;
        this.invoiceConfig = res.data;
        this.loader.hide();
        this.invoiceConfig.invoice_items.forEach((item:any)=>{
          this.calculateAmount(item);
        })
      }
    })
  }

  printInvoice(){

  }

  generateEinvoice(){
    this.router.navigate(['billing/e-invoice'])
  }

 

}
