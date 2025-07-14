import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppAdminSidebarComponent } from './app-admin-sidebar.component';

describe('AppAdminSidebarComponent', () => {
  let component: AppAdminSidebarComponent;
  let fixture: ComponentFixture<AppAdminSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppAdminSidebarComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AppAdminSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
