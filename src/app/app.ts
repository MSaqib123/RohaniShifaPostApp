import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IconSprite } from './shared/components/icon/icon-sprite';
import { ToastViewport } from './shared/components/toast-viewport/toast-viewport';

/**
 * Application root: hosts the shared SVG sprite, the global toast viewport
 * and the router outlet (which instantiates either the public or admin layout).
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, IconSprite, ToastViewport],
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
