import { Injectable } from '@angular/core';
import { ref, getDownloadURL, Storage } from '@angular/fire/storage';
import * as faceapi from 'face-api.js';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FaceRecognitionService {
  matchedPhotos = new BehaviorSubject({progress: 0, photos:[]});

  constructor(private storage: Storage) { 
    this.loadModels();
  }

  async loadModels() {
    const MODEL_URL = '../../../assets/models';
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  }
  async getKnownDescriptor(referenceImageUrl: string): Promise<Float32Array | null> {
    const img = await faceapi.fetchImage(referenceImageUrl);
    const result = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
    return result?.descriptor || null;
  }

   filterPhotosByFaceMatch(referenceImageUrl:string, photos:Array<any>) {
     this.loadModels().then(async ()=>{
       let knownDescriptor
       console.log(referenceImageUrl)
        if(referenceImageUrl == ''){
          const file = await this.selectReferenceImage();
          if (!file) return;
          const image = await this.loadImageFromFile(file);
          const result = await faceapi
          .detectSingleFace(image)
          .withFaceLandmarks()
          .withFaceDescriptor();
          knownDescriptor = result?.descriptor || null;
        }else{
          knownDescriptor = await this.getKnownDescriptor(referenceImageUrl);
        }
        if (!knownDescriptor) {
          console.error("No face detected in reference image");
          return;
        }
        const matcher = new faceapi.FaceMatcher([knownDescriptor]);
        const matchedPhotos:any = [];
        for (let [index, photo] of photos.entries()) {
          try {
            // let dataurl = await this.toDataURL(photo.photo_url)
            const fileRef = ref(this.storage, photo.photo_url);
            let dataurl = await getDownloadURL(fileRef)
            const img = await faceapi.fetchImage(dataurl);
            const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
            const hasMatch = detections.some(det => {
              const match = matcher.findBestMatch(det.descriptor);
              return match.label !== 'unknown';
            });

            if (hasMatch) {
              matchedPhotos.push(photo);
              console.log(matchedPhotos);
            }
             this.matchedPhotos.next({progress: Math.round((index+1)*100/photos?.length), photos: matchedPhotos})
             console.log("MATCHED progres",this.matchedPhotos);
             
          } catch (error) {
            console.error(`Failed to process image ${photo.photo_url}`, error);
          }
        }
        // this.matchedPhotos = matchedPhotos;
     })
  }

  loadImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  selectReferenceImage(): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      console.log('nkdfjlfjlskfjslkfjslkfjslkfjslkefj')
      input.onchange = () => {
        resolve(input.files?.[0] || null);
      };
      input.click();
    });
  }
toDataURL = async (url:any) => {
  var res = await fetch(url);
  var blob = await res.blob();

  const result = await new Promise((resolve, reject) => {
    var reader = new FileReader();
    reader.addEventListener("load", function () {
      resolve(reader.result);
    }, false);
    reader.onerror = () => {
      return reject(this);
    };
    reader.readAsDataURL(blob);
  })
  return String(result).replace(/^data:image\/[a-z]+;base64,/, "")
};

}
