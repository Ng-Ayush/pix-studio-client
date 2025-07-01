import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddManageFeaturesComponent } from './add-manage-features.component';

describe('AddManageFeaturesComponent', () => {
  let component: AddManageFeaturesComponent;
  let fixture: ComponentFixture<AddManageFeaturesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddManageFeaturesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddManageFeaturesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
