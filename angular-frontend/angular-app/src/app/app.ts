import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from './components/nav-bar/nav-bar';
import { FilterDialog } from './dialogs/filter-dialog/filter-dialog';

@Component({
  selector: 'f-root',
  imports: [RouterOutlet, NavBar, FilterDialog],
  templateUrl: './app.html',
})
export class App {}
