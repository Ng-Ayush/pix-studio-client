import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FolderListingScreenComponent } from './folder-listing-screen.component';

describe('FolderListingScreenComponent', () => {
  let component: FolderListingScreenComponent;
  let fixture: ComponentFixture<FolderListingScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FolderListingScreenComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FolderListingScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
