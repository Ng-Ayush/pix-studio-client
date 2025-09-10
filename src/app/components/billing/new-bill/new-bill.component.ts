import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { BillingService } from '../../../services/billing.service';
import { LoaderService } from '../../../shared/loader.service';
import { AlertService } from '../../../services/alert.service';
import { CommonService } from '../../../services/common.service';
import { AdminService } from '../../../services/admin.service';
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
    // { id: 'stock', name: 'Stock' },
  ];

  itemModal: boolean = false;
  invoiceConfig: any = { invoice_items: [] };
  rows = Array(10).fill(0); // simulate 10 rows
  dropdownVisible = false;
  dropdownPosition = { top: 0, left: 0 };
  @ViewChild('inputRef') inputRef: any;
  invoiceItemsList: any = [];
  newItemConfig: any = {};
  isEdit: boolean = false;
  isEditInvoice: boolean = false;
  currentItemIdx: any = 0;
  discount_type: any = 'fixed';
  invoice_number: any = 0;

  partyList: any = [];
  filteredParties: any = [];
  selectedParty: string = '';
  searchQuery: string = '';
  dropdownOpen: boolean = false;
  partyModal: boolean = false;
  partyConfig: any = {};
  showAdvancePaymentModal: boolean = false;
  advancePaymentConfig: any = {};
  pastPayments: any = [];
  isBillFormValid: boolean = false;
  userData: any = {};
  tempInvoiceItemConfig: any = {};
  showLogOutModal: boolean = false;
  filteredInvoiceItems: any = [];
  isEditItemModal: boolean = false;
  forceUpdateModal: boolean = false;


  constructor(private fb: FormBuilder,
    private billingService: BillingService,
    private loader: LoaderService,
    private alert: AlertService,
    private activatedRoute: ActivatedRoute,
    private eRef: ElementRef,
    private commonService: CommonService,
    private adminService: AdminService,
    private router: Router) {
    this.userData = JSON.parse(<any>localStorage.getItem("userData"));
    this.activatedRoute.queryParams.subscribe(params => {
      if (params['invoice_number']) {
        this.invoice_number = params['invoice_number'];
        this.getInvoiceDetailByInvoiceNumber();
      } else {
        this.fetchPartyList();
        this.fetchLastInsertedInvoiceNumber();
      }
    });
    this.invoiceConfig.invoice_date = this.commonService.formatDate(this.todayDate);
    this.invoiceConfig.due_date = this.commonService.formatDate(this.todayDate);
    this.invoiceConfig.time = this.commonService.setCurrentTime();
    this.invoiceConfig.invoice_type = 'estimate';
    // this.getUserData();   //to be commented and removed in future.
  }

  ngOnInit(): void {
    this.addItem();
    this.getAllInvoiceItems();
  }

  async fetchLastInsertedInvoiceNumber() {
    return new Promise((resolve, reject) => {
      this.billingService.getLastInsertedInvoiceNumber((res: any) => {
        if (res.status == 200) {
          this.invoiceConfig.invoice_number = +res.lastInvoiceId + 1;
          resolve(true)
        }
      })
    });

  }

  addItem() {
    this.invoiceConfig.invoice_items.push({
      item_name: '',
      description: '',
      booking_date: '',
      location: '',
      quantity: 1,
      sale_price: 0,
      amount: 0,
      item_code: 0,
    })
  }

  fetchPartyList() {
    this.billingService.getAllParty((res: any) => {
      if (res.status == 200) {
        this.partyList = res.data;
        this.filteredParties = this.partyList;
        console.log(323);

        this.partyList.forEach((e: any) => {
          if (e.id == this.invoiceConfig.party_id) {
            this.searchQuery = e.party_name;
            this.selectedParty = e.party_name;
            this.partyConfig.billing_address = JSON.parse(JSON.stringify(e.billing_address || ''));
          }
        })
      }
    })
  }

  getAllInvoiceItems() {
    this.billingService.getAllInvoiceItems((res: any) => {
      if (res.status == 200) {
        this.invoiceItemsList = res.data;
        this.filteredInvoiceItems = [...this.invoiceItemsList]
      }
    })
  }

  getPastPayments() {
    this.billingService.getPastPayments(this.invoiceConfig.invoice_id, (res: any) => {
      if (res.status == 200) {
        this.pastPayments = res.data;
        this.calculateTotals();
      }
    })
  }

  removeItem(index: any) {
    this.invoiceConfig.invoice_items.splice(index, 1);
    this.calculateTotals();
  }

  showDropdown(event: any, idx: any, item: any) {
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.dropdownPosition = {
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
    };
    this.currentItemIdx = idx;
    item.dropdownVisible = !item.dropdownVisible;
  }



  toggleItemModal() {
    this.itemModal = true;
    this.newItemConfig = {};
  }

  closeModal() {
    this.itemModal = false;
    this.isEdit = false;
    this.partyModal = false;
    this.dropdownVisible = false;
    this.showAdvancePaymentModal = false;
    this.filteredInvoiceItems = [...this.invoiceItemsList]
  }

  addInvoiceItem() {
    this.loader.show();
    this.billingService.addInvoiceItem(this.newItemConfig, (res: any) => {
      if (res.status == 200) {
        this.alert.success(res.message);
        this.getAllInvoiceItems();
        this.loader.hide();
        this.closeModal();
        this.invoiceConfig.invoice_items[this.currentItemIdx] = this.newItemConfig;
        this.invoiceConfig.invoice_items[this.currentItemIdx].id = res.id;
        this.invoiceConfig.invoice_items[this.currentItemIdx].quantity = this.newItemConfig.quanity || 1;


        // this.newItemConfig = {};
        this.calculateAmount(this.invoiceConfig.invoice_items[this.currentItemIdx]);
      } else {
        this.alert.error(res.message)
      }
    })
  }


  getInvoiceItemById(id: any) {
    this.isEdit = true;
    this.loader.show();
    this.billingService.getInvoiceItemById(id, (res: any) => {
      if (res.status == 200) {
        this.loader.hide();
        this.newItemConfig = res.data;
        this.toggleItemModal();
      } else {
        this.loader.hide();
      }
    })
  }

  async updateInvoiceItem() {
    this.loader.show();
    this.billingService.updateInvoiceItem(this.newItemConfig.id, this.newItemConfig, (res: any) => {
      if (res.status == 200) {
        this.forceUpdateModal = false;
        this.alert.success(res.message);
        this.loader.hide();
        this.closeModal();
        this.getAllInvoiceItems();
        this.invoiceConfig.invoice_items[this.currentItemIdx] = this.newItemConfig;
        this.calculateAmount(this.invoiceConfig.invoice_items[this.currentItemIdx]);
      } else {
        this.loader.hide();
        this.alert.success(res.message);
      }
    })
  }

  async confirmUpdateModal() {
    this.forceUpdateModal = true;
  }

  selectItem(invoiceItem: any, item: any) {
    this.invoiceConfig.invoice_items[this.currentItemIdx] = JSON.parse(JSON.stringify(invoiceItem));
    item.dropdownVisible = false;
    this.filteredInvoiceItems = [...this.invoiceItemsList];
    setTimeout(() => {
      this.calculateAmount(invoiceItem);
    }, 0); 
  }

  calculateAmount(item: any) {
    if (item.quantity && item.sale_price) {
      item.amount = item.quantity * item.sale_price;
    } else {
      item.amount = 0;
    }
    this.calculateTotals();
  }

  calculateTotals(typeChange = false) {
    if (typeChange) this.discountAmountVal = 0;
    this.totalAmount = 0;
    this.subTotal = 0;
    this.invoiceConfig.invoice_items.forEach((item: any) => {
      this.totalAmount = this.totalAmount + item.amount;
      this.subTotal = this.subTotal + item.amount;
    });
    if (this.discount_type == 'percentage' && this.discountAmountVal) {
      this.totalAmount = this.totalAmount - ((this.totalAmount * this.discountAmountVal) / 100);
    } else {
      this.totalAmount = this.totalAmount - (this.discountAmountVal || 0);
    }
    if (this.pastPayments.length > 0) {
      let advanceTotal = 0;
      this.pastPayments.forEach((e: any) => {
        advanceTotal = advanceTotal + +e.amount_paid;
      })
      this.totalAmount = this.totalAmount - advanceTotal;
    }

    if (this.discountAmountVal > this.totalAmount) {

    }

    console.log("TOTAL AMOT", this.totalAmount);

  }

  updateEInvoice() {
    this.updateInvoice(true);
  }

  async updateInvoice(isEInvoice?: boolean) {
    return new Promise((resolve, reject) => {

      if (!this.checkBillFormIsValid()) {
        this.loader.hide();
        this.alert.error('Please check mandatory fields or total value cannot be negative');
        reject(false);
        return;
      };
      this.updateParty();
      const params: any = {
        ...this.invoiceConfig,
        total: +this.subTotal,
        balance_left: +this.totalAmount,
        invoice_type: this.invoiceConfig.invoice_type,
        invoice_items: JSON.stringify(this.invoiceConfig.invoice_items.map((item: any) => ({ id: item.id, item_name: item.item_name, booking_date: item.booking_date, location: item.location, quantity: item.quantity, sale_price: item.sale_price, amount: item.amount, description: item.description }))),
        discount_value: this.discountAmountVal,
        discount_type: this.discount_type
      }

      this.billingService.updateInvoice(+this.invoiceConfig.invoice_id, params, (res: any) => {
        if (res.status == 200) {
          this.loader.hide();
          this.alert.success(res.message);
          resolve(true);
          if (isEInvoice) {
            setTimeout(() => {
              this.router.navigate(['billing/e-invoice', this.invoiceConfig.invoice_number], { queryParams: {} });
            }, 0);
          } else {
            this.router.navigate(['/billing']);
          }
        } else {
          this.loader.hide();
          this.alert.error(res.message);
          reject(false)
        }
      })
    })

  }

   updateParty() {
    this.loader.show();
    const params: any = {
      party_name: this.partyConfig.party_name || this.selectedParty,
      phone_number: this.partyConfig.phone_number || this.invoiceConfig.phone_number,
      email: this.partyConfig.email || this.invoiceConfig.email,
      billing_address: this.partyConfig.billing_address || this.invoiceConfig.billing_address,
    }
    this.billingService.updateParty(this.partyConfig.id || this.invoiceConfig.party_id, params, (res: any) => {
      if (res.status == 200) {
        this.loader.hide();
      } else {
        this.loader.hide();
        this.alert.error(res.message);
      }
    })
  }

  async generateInvoice(isEinvoice?: boolean) {
    this.loader.show();
    if (!this.checkBillFormIsValid()) {
      this.loader.hide();
      this.alert.error('Please check mandatory fields or total value cannot be negative');
      return;
    };

    await this.fetchLastInsertedInvoiceNumber();
    await this.updateParty();

    const params: any = {
      ...this.invoiceConfig,
      total: +this.subTotal,
      party_id: +this.invoiceConfig.party_id,
      balance_left: +this.totalAmount,
      invoice_type: this.invoiceConfig.invoice_type,
      invoice_items: JSON.stringify(this.invoiceConfig.invoice_items.map((item: any) => ({ id: item.id, item_name: item.item_name, booking_date: item.booking_date, location: item.location, quantity: item.quantity, sale_price: item.sale_price, amount: item.amount, description: item.description }))),
      discount_value: this.discountAmountVal,
      discount_type: this.discount_type,
      terms_and_condition: this.userData.terms_and_condition || 'Please add your terms and condition here',
    }

    this.billingService.generateInvoice(params, (res: any) => {
      if (res.status == 200) {
        this.loader.hide();
        this.alert.success(res.message);
        if (isEinvoice) {
          this.router.navigate(['billing/e-invoice', this.invoiceConfig.invoice_number], { queryParams: {} });
        } else {
          this.router.navigate(['/billing']);
        }
      } else {
        this.loader.hide();
        this.alert.error(res.message);
      }
    })

  }

  setPhoneNumber(event: any) {
    const parsedValue = JSON.parse(event.target.value);
    this.invoiceConfig.party_id = parsedValue.id;
    this.invoiceConfig.phone_number = parsedValue.phone_number;

  }

  getInvoiceDetailByInvoiceNumber() {
    this.loader.show();
    this.billingService.getInvoiceDetailByInvoiceNumber(this.invoice_number, (res: any) => {
      if (res.status == 200) {
        this.isEditInvoice = true;
        this.invoiceConfig = res.data;
        this.fetchPartyList();
        this.discountAmountVal = this.invoiceConfig.discount_value || 0;
        this.discount_type = this.invoiceConfig.discount_type || 'percentage';
        this.getPastPayments();
        this.loader.hide();
        this.invoiceConfig.invoice_items.forEach((item: any) => {
          this.calculateAmount(item);
        })
      }
    })
  }

  generateEinvoice() {
    this.generateInvoice(true);
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
    if (this.dropdownOpen) {
      this.filterParty();
    }
  }

  selectParty(item: any): void {
    this.selectedParty = item.party_name;
    this.searchQuery = item.party_name;
    this.dropdownOpen = false;
    this.invoiceConfig.party_id = item.id;
    this.invoiceConfig.phone_number = item.phone_number;
    this.partyConfig.billing_address = JSON.parse(JSON.stringify(item.billing_address || ''));
  }

  filterParty(): void {
    const query = this.searchQuery.toLowerCase();
    this.filteredParties = this.partyList.filter((item: any) =>
      item.party_name
        .toLowerCase().includes(query)
    );
  }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(target: any) {
    if (!this.eRef.nativeElement.contains(target)) {
      this.dropdownOpen = false;
    }
  }

  addNewPartyModal() {
    this.partyModal = true;
  }

  saveParty() {
    this.loader.show();
    if (!this.partyConfig.party_name || !this.partyConfig.phone_number) {
      this.loader.hide();
      this.alert.error('Please fill all the fields');
      return;
    }
    this.billingService.createParty(this.partyConfig, (res: any) => {
      if (res.status == 200) {
        this.alert.success(res.message);
        this.partyConfig.id = res.id;
        this.selectParty(this.partyConfig)
        this.loader.hide();
        this.closeModal();
        this.fetchPartyList();
      } else {
        this.alert.error(res.message);
        this.loader.hide();
      }
    })

  }

  assignCode() {
    this.newItemConfig.item_code = this.commonService.generateNewUniqueCode();
  }

  shareInvoice() {

  }

  togglePaymentModal() {
    this.showAdvancePaymentModal = true;
  }

  saveAdvancePayment() {
    console.log(this.invoiceConfig);

    const params: any = {
      invoice_id: this.invoiceConfig.invoice_id,
      party_id: this.invoiceConfig.party_id,
      amount_paid: this.advancePaymentConfig.amount,
      note: this.advancePaymentConfig.note,
      method: this.advancePaymentConfig.method || 'Online'
    };

    this.billingService.saveAdvancePayment(params, (res: any) => {
      if (res.status == 200) {
        this.alert.success(res.message);
        this.showAdvancePaymentModal = false;
        this.advancePaymentConfig = {};
        this.getInvoiceDetailByInvoiceNumber();
      }
    })
  }

  back() {
    this.router.navigate(['/billing']);
  }

  checkBillFormIsValid() {
    console.log(this.invoiceConfig.invoice_items);
    if (this.invoiceConfig.invoice_items.length == 0 || !this.invoiceConfig.party_id || this.totalAmount < 0) {
      this.isBillFormValid = false;
      return false;
    }
    this.isBillFormValid = true;
    return true;
  }

  async convertToSales() {
    const isUpdatedSuccess: any = await this.updateInvoice(true);
    if (isUpdatedSuccess) {
      this.loader.show();
      this.billingService.convertToSales(this.invoiceConfig.invoice_id, (res: any) => {
        if (res.status == 200) {
          this.alert.success(res.message);
          this.loader.hide();
          // this.getEstimateList();
        } else {
          this.loader.hide();
          this.alert.error(res.message);
        }
      })
    }

  }

  toggleLogoutModal() {
    this.showLogOutModal = false;
    this.forceUpdateModal = false;
  }

  logout() {
    this.showLogOutModal = false;
    localStorage.clear();
    this.alert.success('Logout Successfully');
    this.router.navigate(['/login']);
  }

  searchItem(event: any, idx: any) {
    if (event.target.value) {
      this.dropdownVisible = true;
      this.filteredInvoiceItems = this.invoiceItemsList.filter((item: any) => item.item_name.toLowerCase().includes(event.target.value.toLowerCase()));
    } else {
      this.filteredInvoiceItems = this.invoiceItemsList;
    }
  }

  ngAfterViewInit() {
    document.addEventListener('click', (event) => {
      const party_dropdown: any = document.getElementById('party_dropdown');
      const invoice_items: any = document.getElementById(`inputRef_${this.currentItemIdx}`);
      if (!party_dropdown?.contains(event.target)) {
        this.dropdownOpen = false;
      }
      if (!invoice_items?.contains(event.target)) {
        this.invoiceConfig.invoice_items.forEach((item: any) => item.dropdownVisible = false);
      }
    });
  }

  openEditItemModal(item: any, currentIidx: any) {
    this.newItemConfig = item;
    this.itemModal = true;
    this.isEdit = true;
    this.tempInvoiceItemConfig = JSON.parse(JSON.stringify(item));
    this.currentItemIdx = currentIidx;
  }

  closeInvoiceItemModal() {
    // this.invoiceConfig.invoice_items[this.currentItemIdx] = this.tempInvoiceItemConfig;
    this.itemModal = false;
    this.newItemConfig = {};
    this.getAllInvoiceItems();
    console.log(2323);

  }

}
