import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
export const strongPassword: ValidatorFn = (control: AbstractControl<string>): ValidationErrors | null => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(control.value) ? null : { password: true };
export const matchingPasswords: ValidatorFn = (control): ValidationErrors | null => control.get('password')?.value === control.get('confirmPassword')?.value ? null : { passwordMismatch: true };
