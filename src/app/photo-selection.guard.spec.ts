import { TestBed } from '@angular/core/testing';
import { CanMatchFn } from '@angular/router';

import { photoSelectionGuard } from './photo-selection.guard';

describe('photoSelectionGuard', () => {
  const executeGuard: CanMatchFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => photoSelectionGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
