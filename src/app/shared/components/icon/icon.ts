import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';

/**
 * Stroke icon rendered from the shared sprite (§52).
 *
 * ```html
 * <app-icon name="heart" />
 * <app-icon name="play" filled />   <!-- solid variant -->
 * ```
 * Icons are decorative by default (`aria-hidden`); pass `label` to expose a
 * meaningful accessible name when the icon stands alone.
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'icon',
  },
  template: `
    <svg
      class="icon-svg"
      [class.icon-svg--filled]="filled()"
      viewBox="0 0 24 24"
      [attr.role]="label() ? 'img' : null"
      [attr.aria-hidden]="label() ? null : 'true'"
      [attr.aria-label]="label() || null"
    >
      <use [attr.href]="'#i-' + name()" />
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        inline-size: 1.25rem;
        block-size: 1.25rem;
        width: 1.25rem;
        height: 1.25rem;
        max-inline-size: 100%;
        max-block-size: 100%;
        flex: none;
        line-height: 1;
        vertical-align: middle;
      }
      svg {
        display: block;
        inline-size: 100%;
        block-size: 100%;
        width: 100%;
        height: 100%;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
        flex: none;
      }
      svg.icon-svg--filled {
        fill: currentColor;
      }
    `,
  ],
})
export class IconComponent {
  /** Sprite symbol name (without the `i-` prefix). */
  readonly name = input.required<string>();
  /** Solid fill instead of outline. */
  readonly filled = input(false, { transform: booleanAttribute });
  /** Optional accessible name for standalone icons. */
  readonly label = input<string | undefined>(undefined);
}
