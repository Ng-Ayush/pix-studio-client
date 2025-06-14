import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { debounce, debounceTime, distinctUntilChanged, Subject, Subscription, switchMap } from 'rxjs';
@Component({
  selector: 'app-customer',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './customer.component.html',
  styleUrl: './customer.component.scss'
})
export class CustomerComponent {

  todayDate: any = new Date();
  customers: any[] = []
  isModalOpen: boolean = false;
  isEdit: boolean = false;
  currentCustomerId: number = 0;
  deleteModal: boolean = false;
  customer_config: any = {};
  searchText: any = new Subject();
  private subscription!: Subscription;
  imagesArray = [
    { filename: 'image1.jpg', imageData: 'data:image/jpeg;base64,...' }, // Base64 encoded or URL
    { filename: 'image2.jpg', imageData: 'data:image/jpeg;base64,...' },
    { filename: 'image3.jpg', imageData: 'data:image/jpeg;base64,...' },
    // more images
  ];
  constructor(private service: CustomerService) {

  }

  async ngOnInit() {

    this.getAllCustomers();

    this.subscription = this.searchText.pipe(
      debounceTime(500),
      switchMap(value =>
        this.service.searchCustomer(value)
      )
    ).subscribe((res: any) => {
      if(res.status == 200){
        this.customers = res.data;
      }
    })

  }


  // Load image from file input
  loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
        img.onload = () => resolve(img);
        img.onerror = reject;
      };
      reader.readAsDataURL(file);
    });
  }

  // Compare the uploaded face descriptor with the array of images

  getAllCustomers() {
    this.service.getAllCustomers((res: any) => {
      if (res.status == 200) {
        this.customers = res.data;
      } else {

      }
    })
  }

  searchCustomer(event: any) {
    if(event.target.value == ''){
      this.getAllCustomers();
    } else{
      this.searchText.next(event.target.value)
    }
  }


  openModal() {
    this.isModalOpen = true;
    this.customer_config = {};
  }

  onDeleteModal(customer: any) {
    this.deleteModal = true;
    this.currentCustomerId = customer.id;
    this.customer_config = customer;
  }

  onClose() {
    this.isModalOpen = false;
    this.deleteModal = false;
    this.isEdit = false;
  }

  onEdit(customer: any) {
    this.customer_config.name = customer.name
    this.customer_config.phone = customer.phone;
    this.currentCustomerId = customer.id;

    this.isModalOpen = true;
    this.isEdit = true;
  }

  onSubmit() {
    if (!this.isEdit) {
      if (this.customer_config.name.trim() && this.customer_config.phone.trim()) {
        const params: any = {
          name: this.customer_config.name,
          phone: this.customer_config.phone
        };

        this.service.createCustomer(params, (res: any) => {
          if (res.status == 200) {
            this.onClose();
            this.getAllCustomers();
          } else {
            this.onClose();
          }
        })
      }
    } else {
      const params: any = {
        id: this.currentCustomerId,
        name: this.customer_config.name,
        phone: this.customer_config.phone
      };

      this.service.updateCustomer(params, (res: any) => {
        if (res.status == 200) {
          this.onClose();
          this.getAllCustomers();
        } else {
          this.onClose();
        }
      })
    }
  }

  onDelete() {

    this.service.deleteCustomer(this.currentCustomerId, (res: any) => {
      if (res.status == 200) {
        this.onClose();
        this.getAllCustomers();
      }
    })

  }

}
