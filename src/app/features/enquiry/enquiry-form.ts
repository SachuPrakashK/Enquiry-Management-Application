import { ButtonLoader } from '../../shared/button-loader';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EnquiryStore } from './enquiry.store';
import { FieldError } from '../../shared/field-error';
import { Priority } from '../../shared/models';
import { SideDrawer } from '../../shared/side-drawer';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-enquiry-form',
  imports: [ButtonLoader, ReactiveFormsModule, RouterLink, FieldError, SideDrawer],
  templateUrl: './enquiry-form.html',
})
export class EnquiryForm {
  readonly store = inject(EnquiryStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly id = this.route.snapshot.paramMap.get('id');
  readonly backLink = '/admin/enquiries';
  readonly categories = computed(() =>
    this.store
      .categories()
      .filter((item) => item.isActive || item.id === this.store.selectedItem()?.categoryId),
  );
  readonly statuses = computed(() =>
    this.store
      .statuses()
      .filter((item) => item.isActive || item.id === this.store.selectedItem()?.statusId),
  );
  readonly form = inject(NonNullableFormBuilder).group({
    customerName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    phone: [
      '',
      [Validators.required, Validators.pattern(/^(?=(?:\D*\d){7,})\+?[\d\s().-]{7,20}$/)],
    ],
    companyName: ['', Validators.maxLength(150)],
    categoryId: ['', Validators.required],
    subject: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(200)]],
    message: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(5000)]],
    priority: ['' as Priority, Validators.required],
    statusId: ['', Validators.required],
    preferredContactMethod: ['', Validators.required],
    source: ['', Validators.required],
    nextFollowUpDate: [''],
    notes: ['', Validators.maxLength(5000)],
  });
  constructor() {
    this.load();
  }
  close() {
    void this.router.navigateByUrl(this.backLink);
  }
  load() {
    this.store
      .load(this.id || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const item = this.store.selectedItem();
        if (item) this.form.patchValue(item);
        else
          this.form.patchValue({
            statusId:
              this.store.activeStatuses().find((item) => item.code === 'NEW')?.id ||
              this.store.activeStatuses()[0]?.id ||
              '',
            priority:
              this.store.options().priorities.find((value) => value === 'Medium') ||
              this.store.options().priorities[0],
            source: this.store.options().sources[0],
            preferredContactMethod: this.store.options().contactMethods[0],
          });
      });
  }
  submit() {
    if (this.store.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.store
      .save(
        {
          ...value,
          customerName: value.customerName.trim(),
          email: value.email.trim(),
          subject: value.subject.trim(),
          message: value.message.trim(),
        },
        this.id || undefined,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.router.navigate(['/admin/enquiries']));
  }
}
