import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerAuthScreenComponent } from './customer-auth-screen.component';

describe('CustomerAuthScreenComponent', () => {
  let component: CustomerAuthScreenComponent;
  let fixture: ComponentFixture<CustomerAuthScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerAuthScreenComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CustomerAuthScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
