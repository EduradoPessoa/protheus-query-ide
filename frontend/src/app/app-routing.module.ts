import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'query', pathMatch: 'full' },
  { path: 'query', loadChildren: () => import('./features/query-editor/query-editor.module').then(m => m.QueryEditorModule) },
  { path: 'history', loadChildren: () => import('./features/history/history.module').then(m => m.HistoryModule) },
  { path: 'favorites', loadChildren: () => import('./features/favorites/favorites.module').then(m => m.FavoritesModule) },
  { path: 'results', loadChildren: () => import('./features/results/results.module').then(m => m.ResultsModule) }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
