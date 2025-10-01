import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiUploadComponent } from './ai-upload.component';

describe('AiUploadComponent', () => {
  let component: AiUploadComponent;
  let fixture: ComponentFixture<AiUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiUploadComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AiUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
