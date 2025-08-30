import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagePromocodesComponent } from './manage-promocodes.component';

describe('ManagePromocodesComponent', () => {
  let component: ManagePromocodesComponent;
  let fixture: ComponentFixture<ManagePromocodesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagePromocodesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ManagePromocodesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
