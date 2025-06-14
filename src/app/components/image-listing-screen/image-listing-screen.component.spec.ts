import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageListingScreenComponent } from './image-listing-screen.component';

describe('ImageListingScreenComponent', () => {
  let component: ImageListingScreenComponent;
  let fixture: ComponentFixture<ImageListingScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageListingScreenComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ImageListingScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
