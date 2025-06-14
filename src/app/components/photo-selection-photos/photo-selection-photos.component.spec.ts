import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhotoSelectionPhotosComponent } from './photo-selection-photos.component';

describe('PhotoSelectionPhotosComponent', () => {
  let component: PhotoSelectionPhotosComponent;
  let fixture: ComponentFixture<PhotoSelectionPhotosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoSelectionPhotosComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PhotoSelectionPhotosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
