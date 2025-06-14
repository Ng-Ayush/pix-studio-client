import { TestBed } from '@angular/core/testing';

import { PhotoSelectionService } from './photo-selection.service';

describe('PhotoSelectionService', () => {
  let service: PhotoSelectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PhotoSelectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
