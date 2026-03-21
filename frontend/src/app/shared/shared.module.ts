import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PoModule } from '@po-ui/ng-components';

import { ResultGridComponent } from './components/result-grid/result-grid.component';
import { StatusBarComponent } from './components/status-bar/status-bar.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';

@NgModule({
  declarations: [
    ResultGridComponent,
    StatusBarComponent,
    ConfirmDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    PoModule
  ],
  exports: [
    ResultGridComponent,
    StatusBarComponent,
    ConfirmDialogComponent
  ]
})
export class SharedModule { }
