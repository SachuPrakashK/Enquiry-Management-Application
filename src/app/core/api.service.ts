import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './api.config';
import {
  Category,
  CreateDto,
  Entity,
  FollowUp,
  Enquiry,
  EnquiryOptions,
  EnquiryStatus,
  AdminUser,
} from '../shared/models';

class ResourceService<T extends Entity> {
  protected readonly http = inject(HttpClient);
  protected readonly base = inject(API_BASE_URL);
  constructor(private readonly resource: string) {}
  list() {
    return this.http.get<T[]>(`${this.base}/${this.resource}`);
  }
  get(id: string) {
    return this.http.get<T>(`${this.base}/${this.resource}/${encodeURIComponent(id)}`);
  }
  create(dto: CreateDto<T>) {
    return this.http.post<T>(`${this.base}/${this.resource}`, dto);
  }
  update(id: string, dto: Partial<CreateDto<T>>) {
    return this.http.patch<T>(`${this.base}/${this.resource}/${encodeURIComponent(id)}`, dto);
  }
  delete(id: string) {
    return this.http.delete<void>(`${this.base}/${this.resource}/${encodeURIComponent(id)}`);
  }
}
@Injectable({ providedIn: 'root' })
export class StatusService extends ResourceService<EnquiryStatus> {
  constructor() {
    super('statuses');
  }
}
@Injectable({ providedIn: 'root' })
export class CategoryService extends ResourceService<Category> {
  constructor() {
    super('categories');
  }
}
@Injectable({ providedIn: 'root' })
export class EnquiryService extends ResourceService<Enquiry> {
  constructor() {
    super('enquiries');
  }
  options() {
    return this.http.get<EnquiryOptions>(`${this.base}/options`);
  }
}
@Injectable({ providedIn: 'root' })
export class FollowUpService extends ResourceService<FollowUp> {
  constructor() {
    super('followUps');
  }
}
@Injectable({ providedIn: 'root' })
export class AdminUserService extends ResourceService<AdminUser> {
  constructor() {
    super('adminUsers');
  }
}
