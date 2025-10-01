import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FaceDescReadinessComponent } from './face-desc-readiness.component';

describe('FaceDescReadinessComponent', () => {
  let component: FaceDescReadinessComponent;
  let fixture: ComponentFixture<FaceDescReadinessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FaceDescReadinessComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FaceDescReadinessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
