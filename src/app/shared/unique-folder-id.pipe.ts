import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'uniqueFolderId',
  standalone: true
})
export class UniqueFolderIdPipe implements PipeTransform {

  transform(photos: any[]): any[] {
    const uniqueFolders = [];
    const seenFolderIds = new Set();

    for (const photo of photos) {
      if (!seenFolderIds.has(photo.folder_id)) {
        seenFolderIds.add(photo.folder_id);
        uniqueFolders.push(photo);
      }
    }

    return uniqueFolders;
  }

}
