import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from './components/nav-bar/nav-bar';
import { SearchResult } from './molecules/search-bar/search-bar';
import { FilterDialog } from './dialogs/filter-dialog/filter-dialog';

@Component({
  selector: 'f-root',
  imports: [RouterOutlet, NavBar, FilterDialog],
  templateUrl: './app.html',
})
export class App {
  signedIn = signal(false);
  results = signal<SearchResult[]>([]);
}
