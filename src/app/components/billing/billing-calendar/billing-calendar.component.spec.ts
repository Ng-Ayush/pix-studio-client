import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BillingCalendarComponent } from './billing-calendar.component';

describe('BillingCalendarComponent', () => {
  let component: BillingCalendarComponent;
  let fixture: ComponentFixture<BillingCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BillingCalendarComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BillingCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
