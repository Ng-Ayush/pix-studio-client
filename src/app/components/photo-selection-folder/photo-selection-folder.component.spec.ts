import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhotoSelectionFolderComponent } from './photo-selection-folder.component';

describe('PhotoSelectionFolderComponent', () => {
  let component: PhotoSelectionFolderComponent;
  let fixture: ComponentFixture<PhotoSelectionFolderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoSelectionFolderComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PhotoSelectionFolderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
