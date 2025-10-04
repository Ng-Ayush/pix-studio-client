import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadImageProgressAiComponent } from './upload-image-progress-ai.component';

describe('UploadImageProgressAiComponent', () => {
  let component: UploadImageProgressAiComponent;
  let fixture: ComponentFixture<UploadImageProgressAiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadImageProgressAiComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UploadImageProgressAiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
