import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from './components/nav-bar/nav-bar';
import { SearchResult } from './molecules/search-bar/search-bar';

@Component({
  selector: 'f-root',
  imports: [RouterOutlet, NavBar],
  templateUrl: './app.html',
})
export class App {
  signedIn = signal(false);
  results = signal<SearchResult[]>([]);
}