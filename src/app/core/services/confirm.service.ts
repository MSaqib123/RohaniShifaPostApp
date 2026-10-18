import { ComponentPortal } from '@angular/cdk/portal';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { Injectable, inject } from '@angular/core';
import { first } from 'rxjs';
import { ConfirmDialog, ConfirmOptions } from '../../shared/components/confirm/confirm-dialog';

/**
 * Promise-based confirmation dialog (§35):
 *
 * ```ts
 * if (await confirmService.confirm({ title, danger: true })) { …delete… }
 * ```
 * Backdrop click and Escape resolve to `false` — destructive actions are
 * never executed by accident.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly overlay = inject(Overlay);
  private openRef: OverlayRef | null = null;

  confirm(options: ConfirmOptions): Promise<boolean> {
    // One dialog at a time; a new request supersedes the previous one.
    if (this.openRef) {
      this.openRef.detach();
      this.openRef.dispose();
      this.openRef = null;
    }

    return new Promise<boolean>((resolve) => {
      const overlayRef = this.overlay.create({
        hasBackdrop: true,
        backdropClass: 'app-dialog-backdrop',
        positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
        scrollStrategy: this.overlay.scrollStrategies.block(),
      });
      this.openRef = overlayRef;

      const finish = (result: boolean): void => {
        if (this.openRef !== overlayRef) return;
        this.openRef = null;
        overlayRef.detach();
        overlayRef.dispose();
        resolve(result);
      };

      const componentRef = overlayRef.attach(new ComponentPortal(ConfirmDialog));
      componentRef.setInput('options', options);
      componentRef.instance.confirmed.pipe(first()).subscribe(finish);

      overlayRef.backdropClick().subscribe(() => finish(false));
      overlayRef.keydownEvents().subscribe((event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          finish(false);
        }
      });
    });
  }
}
