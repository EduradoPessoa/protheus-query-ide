import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PoModule } from '@po-ui/ng-components';
import { MonacoEditorModule } from 'ngx-monaco-editor';

import { QueryEditorComponent } from './query-editor.component';
import { ToolbarComponent } from './toolbar.component';

@NgModule({
  declarations: [
    QueryEditorComponent,
    ToolbarComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    PoModule,
    MonacoEditorModule
  ],
  exports: [
    QueryEditorComponent,
    ToolbarComponent
  ]
})
export class QueryEditorModule { }
