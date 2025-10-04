import { TestBed } from '@angular/core/testing';

import { UploadImgBgAiService } from './upload-img-bg-ai.service';

describe('UploadImgBgAiService', () => {
  let service: UploadImgBgAiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UploadImgBgAiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
