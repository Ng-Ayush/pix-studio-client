import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../../services/admin.service';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
import { AlertService } from '../../../../services/alert.service';
@Component({
  selector: 'app-manage-categories',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './manage-categories.component.html',
  styleUrl: './manage-categories.component.scss'
})
export class ManageCategoriesComponent {
  catId: any = '';
  filteredItems: any = [];
  categoryModal: boolean = false;
  categoryForm: any;
  categoryNames: any = [];
  storage = inject(Storage);
  isIconUploading: boolean = false;
  isEdit: boolean = false;
  deleteCatModal: boolean = false;

  constructor(private _service: AdminService, private fb: FormBuilder, private alert: AlertService) {
    this.categoryForm = this.fb.group({
      category_name: ['', [Validators.required]],
      category_icon: ['', [Validators.required]],
    });
    this.getAllCategories();
  }

  getAllCategories() {
    this._service.getAllCategories((res: any) => {
      if (res.status == 200) {
        this.filteredItems = res.data;
      }
    })
  }

  onEdit(cat: any) {
    this.catId = cat.category_id;
    this.categoryForm.patchValue(cat);
    this.categoryModal = true;
    this.isEdit = true;

  }

  onDeleteModal(cat: any) {
    this.deleteCatModal = true;
    this.catId = cat.category_id;
  }

  onImgUpload(event: any) {
    this.isIconUploading = true;
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onload = async () => {
      let compressedImage = reader.result as string;
      let blob = this.dataURLtoBlob(compressedImage);
      const fileRef = ref(this.storage, `category-icon/${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, blob);

      uploadTask.then(async () => {
        const url = await getDownloadURL(fileRef);
        this.isIconUploading = false;
        this.categoryForm.patchValue({ category_icon: url })
      })
    }
  }

  dataURLtoBlob(dataURL: string) {
    const byteString = atob(dataURL.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const intArray = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      intArray[i] = byteString.charCodeAt(i);
    }
    return new Blob([arrayBuffer], { type: mimeString });
  }

  oncategoryModal(user: any) {
    this.categoryModal = true;
    this.categoryForm.reset();
  }

  onClose() {
    this.categoryModal = false;
    this.deleteCatModal = false;
    this.isEdit = false;
    this.categoryForm.reset();
  }

  addCategory() {
    if (this.isEdit) {
      this._service.updateCategory(this.categoryForm.value, this.catId, (res: any) => {
        if (res.status == 200) {
          this.alert.success(res.message)
          this.categoryModal = false;
          this.categoryForm.reset();
          this.getAllCategories();
        } else {
          this.alert.error(res.message);
        }
      })
      return;
    }
    this._service.createCategory(this.categoryForm.value, (res: any) => {
      if (res.status == 200) {
        this.alert.success(res.message)
        this.categoryModal = false;
        this.categoryForm.reset();
        this.getAllCategories();
      } else {
        this.alert.error(res.message);
      }
    })
  }

  deleteCategory() {
    this._service.deleteCategory(this.catId, (res: any) => {
      if (res.status == 200) {
        this.alert.success(res.message)
        this.deleteCatModal = false;
        this.getAllCategories();
      } else {
        this.alert.error(res.message);
      }
    })
  }

  trackByFn(index: number, item: any) {
    return item.category_id;
  }
}
