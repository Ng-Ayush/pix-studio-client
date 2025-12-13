import { Injectable } from '@angular/core';
import imageCompression from 'browser-image-compression';

@Injectable({
  providedIn: 'root'
})
export class ImageCompressionService {

  constructor() { }


  async compress3MBToTarget(event: any, quality: any = 'basic') {

    const imageFile = event;

    let maxWidthOrHeight = 1280;
    let maxSizeMB = 1;

    if (quality === 'standard') {
      maxSizeMB = 3;
      maxWidthOrHeight = 1920;
    }

    if (quality === 'high') {
      maxSizeMB = 10;
      maxWidthOrHeight = 4096;  // allows much better detail
    }

    const options = {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: true,
    };
    
    try {
      const compressedFile = await imageCompression(imageFile, options);
      return compressedFile;
    } catch (error) {
      console.log("got error ", error);
      return imageFile;
    }
  }
  async compress50KBToTarget(event: any) {
    const imageFile = event;
    const options = {
      maxSizeMB: 0.1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    }
    try {
      const compressedFile = await imageCompression(imageFile, options);
      return compressedFile;
    } catch (error) {
      console.log("got error ", error);

      return imageFile;
    }

  }
}
