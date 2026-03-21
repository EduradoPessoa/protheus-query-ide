import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PoModule } from '@po-ui/ng-components';
import { MonacoEditorModule } from 'ngx-monaco-editor';

import { QueryEditorComponent } from './query-editor.component';
import { ToolbarComponent } from './toolbar.component';
import { TabsComponent } from './tabs.component';

@NgModule({
  declarations: [
    QueryEditorComponent,
    ToolbarComponent,
    TabsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    PoModule,
    MonacoEditorModule
  ],
  exports: [
    QueryEditorComponent,
    ToolbarComponent,
    TabsComponent
  ]
})
export class QueryEditorModule { }
