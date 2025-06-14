import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfBillSelectionComponent } from './pdf-bill-selection.component';

describe('PdfBillSelectionComponent', () => {
  let component: PdfBillSelectionComponent;
  let fixture: ComponentFixture<PdfBillSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfBillSelectionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PdfBillSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
