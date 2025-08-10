import { Injectable } from '@angular/core';
import imageCompression from 'browser-image-compression';

@Injectable({
  providedIn: 'root'
})
export class ImageCompressionService {

  constructor() { }


  async compress3MBToTarget(event: any) {

    const imageFile = event;
    console.log('originalFile instanceof Blob', imageFile instanceof Blob); // true
    console.log(`originalFile size ${imageFile.size / 1024 / 1024} MB`);

    const options = {
      maxSizeMB: 3,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    }
    try {
      const compressedFile = await imageCompression(imageFile, options);
      console.log('compressedFile instanceof Blob', compressedFile instanceof Blob); // true
      console.log(`compressedFile size ${compressedFile.size / 1024 / 1024} MB`); // smaller than maxSizeMB
      return compressedFile;
      // await uploadToServer(compressedFile); // write your own logic
    } catch (error) {
       console.log("got error ",error);
      return imageFile;
    }
  }
  async compress50KBToTarget(event: any) {

    const imageFile = event;

    const options = {
      maxSizeMB: 0.05,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    }
    try {
      const compressedFile = await imageCompression(imageFile, options);
      console.log('compressedFile instanceof Blob', compressedFile instanceof Blob); // true
      console.log(`compressedFile size ${compressedFile.size / 1024 / 1024} MB`); // smaller than maxSizeMB
      return compressedFile;
    } catch (error) {
      console.log("got error ",error);
      
      return imageFile;
    }

  }
}
