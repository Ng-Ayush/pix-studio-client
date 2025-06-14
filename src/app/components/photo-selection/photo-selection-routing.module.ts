import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PhotoSelectionComponent } from './photo-selection.component';

const routes: Routes = [
  {
    path:'',
    component: PhotoSelectionComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PhotoSelectionRoutingModule { }
