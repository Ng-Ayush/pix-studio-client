import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadImageProgressComponent } from './upload-image-progress.component';

describe('UploadImageProgressComponent', () => {
  let component: UploadImageProgressComponent;
  let fixture: ComponentFixture<UploadImageProgressComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadImageProgressComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UploadImageProgressComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
