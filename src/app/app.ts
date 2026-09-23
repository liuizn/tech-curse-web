import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { TemaService } from './core/tema/tema.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HlmToasterImports],
  templateUrl: './app.html',
})
export class App {
  private readonly tema = inject(TemaService);
}
