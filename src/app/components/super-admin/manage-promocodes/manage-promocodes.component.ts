import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
import { AdminService } from '../../../services/admin.service';
import { AlertService } from '../../../services/alert.service';
@Component({
  selector: 'app-manage-promocodes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ReactiveFormsModule],
  templateUrl: './manage-promocodes.component.html',
  styleUrl: './manage-promocodes.component.scss'
})
export class ManagePromocodesComponent {
  catId: any = '';
  filteredItems: any = [];
  promocodeModal: boolean = false;
  promocodeForm: any;
  promocodeNames: any = [];
  storage = inject(Storage);
  isLoading: boolean = false;
  isEdit: boolean = false;
  deleteCatModal: boolean = false;

  constructor(private _service: AdminService, private fb: FormBuilder, private alert: AlertService) {
    this.promocodeForm = this.fb.group({
      code: ['', [Validators.required]],
      discount_type: ['', []],
      discount_value: ['', [Validators.required]],
      valid_from: [null, []],
      valid_to: [null, []],
    });
    this.getAllPromocodes();
  }

  getAllPromocodes() {
    this._service.getAllPromocodes((res: any) => {
      if (res.status == 200) {
        this.filteredItems = res.data;
      }
    })
  }

  onEdit(cat: any) {
    this.catId = cat.id;
    this.promocodeForm.patchValue(cat);
    this.promocodeModal = true;
    this.isEdit = true;

  }

  onDeleteModal(cat: any) {
    this.deleteCatModal = true;
    this.catId = cat.id;
  }

  onpromocodeModal(user: any) {
    this.promocodeModal = true;
    this.promocodeForm.reset();
  }

  onClose() {
    this.promocodeModal = false;
    this.deleteCatModal = false;
    this.isEdit = false;
    this.promocodeForm.reset();
  }

  addPromocode() {
    this.isLoading = true;
    if (this.isEdit) {
      this._service.updatePromocode(this.promocodeForm.value, this.catId, (res: any) => {
        this.isLoading = false;
        if (res.status == 200) {
          this.alert.success(res.message)
          this.promocodeModal = false;
          this.promocodeForm.reset();
          this.getAllPromocodes();
        } else {
          this.alert.error(res.message);
        }
      })
      return;
    }
    this._service.createPromocode(this.promocodeForm.value, (res: any) => {
      this.isLoading = false;
      if (res.status == 200) {
        this.alert.success(res.message)
        this.promocodeModal = false;
        this.promocodeForm.reset();
        this.getAllPromocodes();
      } else {
        this.alert.error(res.message);
      }
    })
  }

  deletePromocode() {
    this._service.deletePromocode(this.catId, (res: any) => {
      if (res.status == 200) {
        this.alert.success(res.message)
        this.deleteCatModal = false;
        this.getAllPromocodes();
      } else {
        this.alert.error(res.message);
      }
    })
  }

  togglePromocodeStatus(code: any) {
    const params: any = {
      status: !code.is_active,
      promocode_id: code.id
    }
    this._service.togglePromocodeStatus(params, (res: any) => {
      if (res.status == 200) {
        this.alert.success(res.message)
        this.getAllPromocodes();
      } else {
        this.alert.error(res.message);
      }
    })
  }

  copyMessage(code:any) {
    const message = code;
    navigator.clipboard.writeText(message).then(() => {
      this.alert.success('Promocode copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy code: ', err);
    });
  }

  trackByFn(index: number, item: any) {
    return item.promocode_id;
  }
}
