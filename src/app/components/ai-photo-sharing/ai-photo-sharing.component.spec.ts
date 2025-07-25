import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiPhotoSharingComponent } from './ai-photo-sharing.component';

describe('AiPhotoSharingComponent', () => {
  let component: AiPhotoSharingComponent;
  let fixture: ComponentFixture<AiPhotoSharingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiPhotoSharingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AiPhotoSharingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
