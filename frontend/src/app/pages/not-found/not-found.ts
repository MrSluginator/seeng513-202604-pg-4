import { Component } from '@angular/core';
import { StatusView } from '../../components/status-view/status-view';

@Component({
  imports: [StatusView],
  selector: 'f-not-found',
  styleUrl: './not-found.css',
  templateUrl: './not-found.html',
})
export class NotFound {}
