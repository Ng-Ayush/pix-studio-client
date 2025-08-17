import { TestBed } from '@angular/core/testing';

import { DeleteImgBackgroundService } from './delete-img-background.service';

describe('DeleteImgBackgroundService', () => {
  let service: DeleteImgBackgroundService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeleteImgBackgroundService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
