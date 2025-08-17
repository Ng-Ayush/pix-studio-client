import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteImageProcessComponent } from './delete-image-process.component';

describe('DeleteImageProcessComponent', () => {
  let component: DeleteImageProcessComponent;
  let fixture: ComponentFixture<DeleteImageProcessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteImageProcessComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DeleteImageProcessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
