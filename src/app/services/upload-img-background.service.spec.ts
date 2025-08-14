import { TestBed } from '@angular/core/testing';

import { UploadImgBackgroundService } from './upload-img-background.service';

describe('UploadImgBackgroundService', () => {
  let service: UploadImgBackgroundService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UploadImgBackgroundService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
