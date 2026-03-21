import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  PoListViewModule,
  PoButtonModule,
  PoIconModule,
  PoFieldModule,
  PoTagModule,
  PoDialogModule,
  PoNotificationModule
} from '@po-ui/ng-components';
import { FavoritesComponent } from './favorites.component';

@NgModule({
  declarations: [FavoritesComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([]),
    PoListViewModule,
    PoButtonModule,
    PoIconModule,
    PoFieldModule,
    PoTagModule,
    PoDialogModule,
    PoNotificationModule
  ],
  exports: [FavoritesComponent]
})
export class FavoritesModule { }
