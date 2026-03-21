import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { PoModule } from '@po-ui/ng-components';

import { HistoryComponent } from './history.component';

@NgModule({
  declarations: [HistoryComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([]),
    PoModule
  ],
  exports: [HistoryComponent]
})
export class HistoryModule { }
