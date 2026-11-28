import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from './components/nav-bar/nav-bar';
import { FilterDialog } from './dialogs/filter-dialog/filter-dialog';
import { AuthService } from './services/auth-service';
import { SignInDialog } from './dialogs/sign-in-dialog/sign-in-dialog';

@Component({
  selector: 'f-root',
  imports: [RouterOutlet, NavBar, FilterDialog, SignInDialog],
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthService);
}
