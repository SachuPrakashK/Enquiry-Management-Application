import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-field-error',
  templateUrl: './field-error.html',
})
export class FieldError {
  readonly control = input.required<AbstractControl>();
  readonly label = input('This field');
  readonly hint = input('Enter a valid value.');
  private readonly state = toSignal(
    toObservable(this.control).pipe(switchMap((control) => control.events)),
  );
  readonly visible = computed(() => {
    this.state();
    return this.control().invalid && this.control().touched;
  });
}
