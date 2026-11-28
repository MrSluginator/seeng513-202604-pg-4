import { Component } from '@angular/core';
import { StatusView } from '../../components/status-view/status-view';

@Component({
  imports: [StatusView],
  selector: 'f-forbidden',
  styleUrl: './forbidden.css',
  templateUrl: './forbidden.html',
})
export class Forbidden {}
