import { Injectable } from '@angular/core';
import { BaseService } from './base.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class PhotoSelectionService extends BaseService {
  constructor(
    http: HttpClient,
  ) {
    super(http)
  }

  createEvent(params: any, callback: any) {
    return this.postData(params, this.httpUrls['createEvent'], callback)
  }

  getAllEvents(callback: any) {
    return this.getData({}, this.httpUrls['getAllEvents'], callback)
  }

  getEventById(event_id: any, callback: any) {
    return this.getData({}, this.httpUrls['getEventById'] + "/" + event_id, callback)
  }


  updateEvent(params: any, id: any, callback: any) {
    return this.putData(params, this.httpUrls['updateEvent'] + "/" + id, callback)
  }

  getFolderByEventId(event_id: any, callback: any) {
    return this.getData({}, this.httpUrls['getFolderByEventId'] + "/" + event_id, callback)
  }

  createNewFolder(params: any, callback: any) {
    return this.postData(params, this.httpUrls['createNewFolder'], callback)
  }

  updateFolder(params: any, id: any, callback: any) {
    return this.putData(params, this.httpUrls['updateFolder'] + "/" + id, callback)
  }

  deleteFolder(id: any, callback: any) {
    return this.deleteData({}, this.httpUrls['deleteFolder'] + "/" + id, callback)
  }

  deleteEvent(id: any, callback: any) {
    return this.deleteData({}, this.httpUrls['deleteEvent'] + "/" + id, callback)
  }

  getAiGuestByEventId(id: any, callback: any) {
    return this.getData({}, this.httpUrls['getAiGuestByEventId'] + "/" + id, callback)
  }

  addAiGuest(params: any, callback: any) {
    return this.postData(params, this.httpUrls['addAiGuest'], callback)
  }

  getUploadedPhotosByFolderId(folder_id: any, callback: any) {
    return this.getData({}, this.httpUrls['getUploadedPhotosByFolderId'] + "/" + folder_id, callback)
  }

  uploadPhotos(params: any, callback: any) {
    return this.postData(params, this.httpUrls['uploadPhotos'], callback)
  }

  deletePhotos(params: any, callback: any) {
    return this.postData(params, this.httpUrls['deletePhotos'], callback)
  }

  updatePhotoStatus(params: any, callback: any) {
    return this.postData(params, this.httpUrls['updatePhotoStatus'], callback)
  }

  submitEvent(params: any, callback: any) {
    return this.postData(params, this.httpUrls['submitEvent'], callback)
  }

  // getAllPhotosByEventId(event_id:any,user_id:any,callback:any){
  //   return this.getData({}, this.httpUrls['getAllPhotosByEventId']+"/"+event_id+"?user="+user_id, callback)
  // }

  getAllPhotosByEventId(params: any, user_id: any, callback: any) {
    let url = `${this.httpUrls['getAllPhotosByEventId']}/${params.event_id}?user=${+user_id}&page=${+params.page}&limit=${+params.limit}`;
    if (params.folder_id) {
      url += `&folder_id=${+params.folder_id}`;
    }
    return this.getData({}, url, callback);
  }


  checkIsBrowseAllFolderStatus(params: any, callback: any) {
    return this.getData({}, this.httpUrls['checkIsBrowseAllFolderStatus'] + "/" + params.event_id + "?user_id=" + params.user_id, callback)
  }

  sendBulkMessage(params: any, callback: any) {
    return this.postData(params, this.httpUrls['sendBulkMessage'], callback)
  }

  checkHasUserAlreadyReviewed(params: any, callback: any) {
    return this.postData(params, this.httpUrls['checkHasUserAlreadyReviewed'], callback)
  }

  getTotalUploadedAiPhotosCount(callback: any) {
    return this.getData({}, this.httpUrls['getTotalUploadedAiPhotosCount'], callback)
  }

  getFoldersByEventId(event_id: any, user_id: any, callback: any) {
    return this.getData({}, this.httpUrls['getFoldersByEventId'] + "/" + event_id + "?user=" + user_id + "", callback)
  }

  updateFaceDescriptorEvent(event_id: any, callback: any) {
    return this.postData({}, this.httpUrls['updateFaceDescriptorEvent']+"/"+event_id, callback)
  }
}
