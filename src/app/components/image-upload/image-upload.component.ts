import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, Input, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxImageCompressService } from 'ngx-image-compress';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
import { PhotoSelectionService } from '../../services/photo-selection.service';
import { getMetadata } from 'firebase/storage';
@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './image-upload.component.html',
  styleUrl: './image-upload.component.scss'
})
export class ImageUploadComponent {

  constructor(private http: HttpClient, private imageCompress: NgxImageCompressService ,private pservice:PhotoSelectionService) { }

  imageArray: any = [];
  

  @Input() inputConfig:any= {};


  // Folder Selection
  


  // handleFileInput(event: any) {
  //   const files: FileList = event.target.files;
  //   if (files.length === 0) return;

  //   const uploadPromises = [];

  //   for (let i = 0; i < files.length; i++) {
  //     const file = files[i];
  //     uploadPromises.push(this.compressAndUpload(file));
  //   }

  //   // Execute all uploads in parallel
  //   Promise.all(uploadPromises).then((urls) => {
  //     this.uploadedUrls = urls;
  //     console.log(this.uploadedUrls);

  //     // this.storeUrlsInDatabase(urls, files);
  //   });
  // }


  // async compressAndUpload(file: File): Promise<string> {
  //   const fileName = file.name; // Keep the original name

  //   return new Promise((resolve, reject) => {
  //     const reader = new FileReader();
  //     reader.readAsDataURL(file);
  //     reader.onload = async () => {
  //       let compressedImage = reader.result as string;
  //       let quality = 100; // Start with the highest quality
  //       let blob = this.dataURLtoBlob(compressedImage);

  //       while (blob.size > 100 * 1024 && quality > 10) { // Reduce quality if > 100KB
  //         compressedImage = await this.imageCompress.compressFile(
  //           reader.result as string,
  //           -1,
  //           quality, // Adjust quality dynamically
  //           quality
  //         );
  //         blob = this.dataURLtoBlob(compressedImage);
  //         quality -= 5; // Reduce quality in small steps
  //       }

  //       const fileRef = ref(this.storage, `uploads/${fileName}`);
  //       const uploadTask = uploadBytesResumable(fileRef, blob);

  //       uploadTask.then(async () => {
  //         const url = await getDownloadURL(fileRef);
  //         resolve(url);
  //       }).catch(reject);
  //     };
  //   });
  // }

  // dataURLtoBlob(dataURL: string) {
  //   const byteString = atob(dataURL.split(',')[1]);
  //   const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
  //   const arrayBuffer = new ArrayBuffer(byteString.length);
  //   const intArray = new Uint8Array(arrayBuffer);
  //   for (let i = 0; i < byteString.length; i++) {
  //     intArray[i] = byteString.charCodeAt(i);
  //   }
  //   return new Blob([arrayBuffer], { type: mimeString });
  // }



 


}
