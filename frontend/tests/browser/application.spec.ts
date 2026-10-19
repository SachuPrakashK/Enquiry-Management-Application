import { test, expect, type Locator, type Page } from '@playwright/test';
import type { Enquiry, EnquiryStatus } from '../../src/app/shared/models';

const browserErrors = new WeakMap<Page, string[]>();
test('global Inter and logical Back links work on direct navigation', async ({ page }) => {
  await login(page);
  const fonts = await page.evaluate(async () => {
    const loaded = await document.fonts.load('14px Inter');
    return { count: loaded.length, family: getComputedStyle(document.body).fontFamily };
  });
  expect(fonts.count).toBeGreaterThan(0);
  expect(fonts.family).toContain('Inter');
  await page.goto('/admin/enquiries/i1/edit');
  await expect(page.getByRole('heading', { name: 'Enquiry Listing' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Edit Enquiry' })).toHaveCount(1);
  await page.getByRole('dialog', { name: 'Edit Enquiry' }).getByRole('button', { name: 'Close drawer' }).click();
  await expect(page).toHaveURL(/\/admin\/enquiries$/);
  await page.goto('/admin/enquiries/i1');
  await page.getByRole('link', { name: 'Back', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/enquiries$/);
  await page.goto('/admin/categories/create');
  await page.getByRole('dialog', { name: 'Create category' }).getByRole('button', { name: 'Close drawer' }).click();
  await expect(page).toHaveURL(/\/admin\/categories$/);
});
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      !/Failed to load resource|net::ERR_FAILED/.test(message.text())
    )
      errors.push(message.text());
  });
});
test.afterEach(({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('admin123');
  await page.getByLabel('Remember me').check();
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  await expect(page.locator('.stat-value')).toHaveCount(5);
}
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Username').fill('maya.patel');
  await page.getByLabel('Password').fill('admin123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
}
async function openProfileMenu(page: Page) {
  await page.getByRole('button', { name: 'Open profile menu' }).click();
}
async function openRowActions(row: Locator) {
  await row.getByRole('button', { name: /Actions for/ }).click();
}
test('authentication guard, validation, refresh, logout, and fallback route', async ({ page }) => {
  await page.goto('/admin/enquiries');
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Username is required.')).toBeVisible();
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('incorrect');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('incorrect');
  await page.getByLabel('Password').fill('admin123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  await openProfileMenu(page);
  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await page.goto('/admin/statuses/create');
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await page.goto('/missing-page');
  await expect(page.getByRole('heading', { name: 'This page is not available' })).toBeVisible();
});
test('guest guard, malformed sessions, role restrictions, and profile navigation', async ({
  page,
}) => {
  await login(page);
  await page.goto('/login');
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await openProfileMenu(page);
  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await page.evaluate(() => sessionStorage.setItem('enquiry-admin-session', '{malformed'));
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await loginAsAdmin(page);
  await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Enquiry Status' })).toHaveCount(0);
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await page.goto('/admin/statuses');
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await openProfileMenu(page);
  await page.getByRole('menuitem', { name: 'Profile' }).click();
  await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
  await expect(page.getByLabel('Role')).toBeDisabled();
});

test('user CRUD, search, filters, profile update, toast, and shared confirmation', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/users/create');
  await page.getByRole('button', { name: 'Create user' }).click();
  await expect(page.getByText('First name is required.')).toBeVisible();
  await page.getByLabel('First name').fill('Browser');
  await page.getByLabel('Last name').fill('Administrator');
  await page.getByLabel('Email', { exact: false }).fill('browser.admin@example.com');
  await page.getByLabel('Username', { exact: false }).fill('browser.admin');
  await page.getByLabel(/^Password/).fill('StrongPass1!');
  await page.getByLabel(/^Confirm password/).fill('StrongPass1!');
  await page.getByRole('button', { name: 'Create user' }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);
  await expect(page.locator('.toast.success')).toContainText('created successfully');
  await page.getByRole('searchbox', { name: 'Search users' }).fill('browser.admin');
  let row = page.locator('tbody tr').filter({ hasText: 'browser.admin' });
  await openRowActions(row);
  await row.getByRole('menuitem', { name: 'View' }).click();
  await expect(page.getByRole('heading', { name: 'User Details' })).toBeVisible();
  const detailUrl = page.url();
  await page.getByRole('link', { name: 'Edit user' }).click();
  await page.getByLabel('First name').fill('Updated');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);
  await page.getByRole('searchbox', { name: 'Search users' }).fill('browser.admin');
  row = page.locator('tbody tr').filter({ hasText: 'browser.admin' });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Updated Administrator');
  await page.getByRole('button', { name: /^Filters/ }).click();
  await page.getByLabel('Role', { exact: true }).selectOption('Admin');
  await page.getByLabel('Status', { exact: true }).selectOption('true');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(row).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await openRowActions(row);
  await row.getByRole('menuitem', { name: 'Deactivate' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Deactivate' }).click();
  await expect(row).toContainText('Inactive');
  await openRowActions(row);
  await row.getByRole('menuitem', { name: 'Delete' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Delete User');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(row).toHaveCount(1);
  await openRowActions(row);
  await row.getByRole('menuitem', { name: 'Delete' }).click();
  await dialog.getByRole('button', { name: 'Delete' }).click();
  await expect(row).toHaveCount(0);
  await expect(page.locator('.toast.success').filter({ hasText: 'deleted successfully' })).toBeVisible();
  await page.goto(detailUrl);
  await expect(page.getByRole('alert')).toContainText('could not be found');
  await page.goto('/admin/profile');
  await page.getByLabel('First name').fill('System Profile');
  await page.getByRole('button', { name: 'Update profile' }).click();
  await expect(page.locator('.toast.success').filter({ hasText: 'updated successfully' })).toBeVisible();
});

test('401 clears the session while 403 preserves it and shows access feedback', async ({
  page,
}) => {
  await login(page);
  await page.route('**/api/enquiries', (route) =>
    route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: '{"message":"Forbidden"}',
    }),
  );
  await page.goto('/admin/enquiries');
  await expect(page.locator('.toast.warning')).toContainText('permission');
  await expect(page).toHaveURL(/\/admin\/enquiries$/);
  await page.unroute('**/api/enquiries');
  await page.route('**/api/enquiries', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: '{"message":"Unauthorized"}',
    }),
  );
  await page.reload();
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await expect(page.locator('.toast.error')).toContainText('session');
});

for (const kind of ['statuses', 'categories'] as const) {
  test(`${kind}: full CRUD, search, activation, persistence, and referenced-delete protection`, async ({
    page,
  }) => {
    await login(page);
    const singular = kind === 'statuses' ? 'status' : 'category';
    await page.goto(`/admin/${kind}/create`);
    await page.getByRole('button', { name: `Save ${singular}` }).click();
    await expect(page.getByText('Name is required.')).toBeVisible();
    await page.getByLabel('Name', { exact: false }).fill(`Browser ${singular}`);
    await page.getByLabel('Code', { exact: false }).fill(`BROWSER_${singular.toUpperCase()}`);
    await page.getByLabel('Description').fill('Created through the admin application');
    await page.getByRole('button', { name: `Save ${singular}` }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/${kind}$`));
    const search = page.getByRole('searchbox');
    await search.fill(`Browser ${singular}`);
    let row = page.locator('tbody tr').filter({ hasText: `Browser ${singular}` });
    await expect(row).toHaveCount(1);
    await openRowActions(row);
    await row.getByRole('menuitem', { name: 'Edit' }).click();
    await page.getByLabel('Name', { exact: false }).fill(`Edited ${singular}`);
    await page.getByRole('button', { name: `Save ${singular}` }).click();
    row = page.locator('tbody tr').filter({ hasText: `Edited ${singular}` });
    await openRowActions(row);
    await row.getByRole('menuitem', { name: 'Deactivate' }).click();
    await expect(row).toContainText('Inactive');
    await page.reload();
    await expect(row).toContainText('Inactive');
    await openRowActions(row);
    await row.getByRole('menuitem', { name: 'Activate' }).click();
    await expect(row).toContainText('Active');
    await openRowActions(row);
    await row.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(row).toHaveCount(1);
    await openRowActions(row);
    await row.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(row).toHaveCount(0);
    const referencedRow = page.locator('tbody tr').first();
    await openRowActions(referencedRow);
    await referencedRow.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.locator('.toast.error')).toContainText('Deactivate it instead');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  });
}

test('enquiry creation, edit, status changes from details and list, follow-up CRUD, refresh, and delete', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/enquiries/create');
  await page.getByRole('button', { name: 'Create enquiry' }).click();
  await expect(page.getByText('Customer name is required.')).toBeVisible();
  await page.getByLabel('Customer name').fill('Browser Test Customer');
  await page.getByLabel('Company name').fill('Browser Test Company');
  await page.getByLabel('Email address').fill('browser@example.com');
  await page.getByLabel('Phone number').fill('+1 415 555 1234');
  await page.getByLabel('Enquiry category').selectOption('c1');
  await page.getByLabel('Subject', { exact: false }).fill('Browser project enquiry');
  await page
    .getByLabel('Message', { exact: false })
    .fill('We need a new customer portal for our business.');
  await page.getByRole('button', { name: 'Create enquiry' }).click();
  await expect(page).toHaveURL(/\/admin\/enquiries$/);
  await expect(page.locator('.toast.success')).toContainText('Enquiry created successfully.');
  const createdRow = page.locator('tbody tr').filter({ hasText: 'Browser Test Customer' });
  await expect(createdRow).toBeVisible();
  const reference = (await createdRow.locator('td').first().innerText()).trim();
  expect(reference).toMatch(/^ENQ-\d{4}-\d{4}$/);
  await createdRow.click();
  await expect(page.locator('h1')).toHaveText(reference);
  const detailUrl = page.url();
  await page.getByRole('link', { name: 'Edit enquiry', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Enquiry Listing' })).toBeVisible();
  await page.getByLabel('Subject', { exact: false }).fill('Updated browser project');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page).toHaveURL(/\/admin\/enquiries$/);
  await expect(createdRow).toContainText('Updated browser project');
  await createdRow.click();
  await expect(page.getByRole('heading', { name: 'Updated browser project' })).toBeVisible();
  await expect(page.locator('h1')).toHaveText(reference);
  await page.getByRole('button', { name: 'Change status', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Status').selectOption('s3');
  await page.getByRole('button', { name: 'Update status', exact: true }).click();
  await expect(page.locator('app-enquiry-detail app-badge').first()).toContainText('In Progress');
  await page.getByRole('button', { name: 'Add follow-up' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Follow-up date', { exact: false }).first().fill('2026-09-24');
  await dialog
    .getByLabel('Notes', { exact: false })
    .fill('Discussed requirements with the customer.');
  await dialog.getByLabel('Outcome').fill('Proposal requested');
  await dialog.getByLabel('Next follow-up date').fill('2026-09-28');
  await dialog.getByRole('button', { name: 'Save follow-up' }).click();
  await expect(page.locator('.timeline-item')).toContainText('Proposal requested');
  await page.getByRole('button', { name: 'Edit follow-up' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Outcome').fill('Proposal approved');
  await dialog.getByLabel('Next follow-up date').fill('2026-09-29');
  await dialog.getByRole('button', { name: 'Save follow-up' }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(page.locator('.timeline-item')).toContainText('Proposal approved');
  await expect(page.locator('.timeline-item')).toContainText('29 Sep 2026');
  await page.getByRole('button', { name: 'Delete follow-up' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('No follow-ups recorded yet.')).toBeVisible();
  await page.goto('/admin/enquiries');
  await page.getByRole('searchbox', { name: 'Search enquiries' }).fill(reference);
  const row = page.locator('tbody tr').filter({ hasText: reference });
  await openRowActions(row);
  await row.getByRole('menuitem', { name: 'Change status' }).click();
  await page.getByRole('dialog').getByLabel('Status').selectOption('s5');
  await page.getByRole('button', { name: 'Update status', exact: true }).click();
  await expect(row).toContainText('Converted');
  await page.goto(detailUrl);
  await expect(page.locator('app-enquiry-detail app-badge').first()).toContainText('Converted');
  await page.goto('/admin/enquiries');
  await page.getByRole('searchbox', { name: 'Search enquiries' }).fill(reference);
  await openRowActions(row);
  await row.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No matching records found' })).toBeVisible();
  await page.goto(detailUrl);
  await expect(page.getByRole('alert')).toContainText('could not be found');
});

test('search, combined filters, date validation, sorting, and pagination', async ({
  page,
  request,
}) => {
  await login(page);
  const items: Enquiry[] = await (await request.get('/api/enquiries')).json();
  await page.goto('/admin/enquiries');
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(items.length - 10);
  await page.getByRole('button', { name: 'Previous page' }).click();
  await page.getByLabel('Rows', { exact: true }).selectOption({ label: '5' });
  await expect(page.locator('tbody tr')).toHaveCount(5);
  await page.getByRole('searchbox', { name: 'Search enquiries' }).fill('olivia.rhye@example.com');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody tr')).toContainText('Olivia Rhye');
  await page.getByRole('button', { name: /^Filters/ }).click();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByLabel('Status', { exact: true }).selectOption('s1');
  await page.getByLabel('Category', { exact: true }).selectOption('c1');
  await page.getByLabel('Priority', { exact: true }).selectOption('High');
  await page.getByLabel('Source', { exact: true }).selectOption('Website');
  await page.getByLabel('Created date from').fill('2026-09-01');
  await page.getByLabel('Created date to').fill('2026-09-30');
  await page.getByLabel('Follow-up date', { exact: true }).fill('2026-09-24');
  await page.getByLabel('Customer', { exact: true }).fill('Olivia');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody tr')).toContainText('Olivia Rhye');
  await page.getByLabel('Created date from').fill('2026-10-01');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByRole('alert')).toContainText('on or before');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByRole('searchbox', { name: 'Search enquiries' }).clear();
  await page.getByLabel('Sort by').selectOption('customer');
  await expect(page.locator('tbody tr').first()).toContainText('Andi Lane');
});

test('dashboard counts match API and follow-up tabs partition scheduled work', async ({
  page,
  request,
}) => {
  await login(page);
  const items: Enquiry[] = await (await request.get('/api/enquiries')).json();
  const statuses: EnquiryStatus[] = await (await request.get('/api/statuses')).json();
  const code = (id: string) => statuses.find((status) => status.id === id)?.code;
  const expected = [
    items.length,
    items.filter((item) => code(item.statusId) === 'NEW').length,
    items.filter((item) => code(item.statusId) === 'IN_PROGRESS').length,
    items.filter((item) => ['CLOSED', 'CONVERTED'].includes(code(item.statusId) || '')).length,
    items.filter((item) => item.nextFollowUpDate).length,
  ];
  await expect(page.locator('.stat-value')).toHaveText(expected.map(String));
  const recentTable = page.locator('section.card').filter({ has: page.getByRole('heading', { name: 'Recent enquiries' }) });
  let dashboardRow = recentTable.locator('tbody tr').first();
  const recentId = items
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]!.id;
  await dashboardRow.locator('td').first().click();
  await expect(page).toHaveURL(new RegExp(`/admin/enquiries/${recentId}$`));
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  dashboardRow = recentTable.locator('tbody tr').first();
  await dashboardRow.focus();
  await dashboardRow.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/admin/enquiries/${recentId}$`));
  await page.goBack();
  const followUpTable = page.locator('section.card').filter({ has: page.getByRole('heading', { name: 'Follow-ups to keep on your radar' }) });
  const followUpRow = followUpTable.locator('tbody tr').first();
  const followUpReference = (await followUpRow.locator('td').first().innerText()).trim();
  const followUpItem = items.find((item) => item.referenceNumber === followUpReference)!;
  await followUpRow.locator('td').nth(2).click();
  await expect(page).toHaveURL(new RegExp(`/admin/enquiries/${followUpItem.id}$`));
  await page.goBack();
  await page.screenshot({ path: '.test-output/dashboard-desktop.png', fullPage: true });
  await page.goto('/admin/follow-ups');
  for (const tab of ['Today', 'Upcoming', 'Overdue', 'Completed']) {
    await page.getByRole('button', { name: new RegExp(`^${tab}`) }).click();
    await expect(page.getByRole('button', { name: new RegExp(`^${tab}`) })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  }
  await expect(page.locator('tbody tr')).toHaveCount(4);
});

test('mobile navigation, responsive forms and tables, and no browser exceptions', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await expect(page.getByRole('button', { name: 'Toggle navigation' })).toBeVisible();
  await page.screenshot({ path: '.test-output/dashboard-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await page.getByRole('link', { name: 'Enquiry Listing', exact: false }).click();
  await expect(page.locator('.sidebar')).not.toHaveClass(/open/);
  await expect(page.locator('tbody tr')).toHaveCount(10);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const dimensions = await page
    .locator('.table-scroll')
    .evaluate((element) => ({ inner: element.scrollWidth, outer: element.clientWidth }));
  expect(dimensions.inner).toBeGreaterThan(dimensions.outer);
  await page.goto('/admin/enquiries/create');
  await expect(page.getByLabel('Customer name')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: '.test-output/enquiry-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('API unavailable, failed save, and missing record have clear feedback', async ({ page }) => {
  await login(page);
  await page.route('**/api/enquiries', (route) => route.abort());
  await page.goto('/admin/enquiries');
  await expect(page.getByRole('alert')).toContainText('API is unavailable');
  await page.unroute('**/api/enquiries');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await page.goto('/admin/categories/create');
  await page.getByLabel('Name', { exact: false }).fill('Failed save');
  await page.getByLabel('Code', { exact: false }).fill('FAILED_SAVE');
  await page.route('**/api/categories', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Unable to save data. Please try again.' }),
        })
      : route.continue(),
  );
  await page.getByRole('button', { name: 'Save category' }).click();
  await expect(page.locator('.toast.error')).toContainText('Unable to save');
  await expect(page.getByLabel('Name', { exact: false })).toHaveValue('Failed save');
  await expect(page.getByRole('button', { name: 'Save category' })).toBeEnabled();
  await page.goto('/admin/enquiries/nonexistent');
  await expect(page.getByRole('alert')).toContainText('could not be found');
});

test('registration uses adminUsers and the new account can sign in', async ({ page, request }) => {
  const suffix = Date.now();
  const email = `registered.${suffix}@example.com`;
  const username = `registered.${suffix}`;
  await page.goto('/auth/register');
  await page.getByLabel('First name').fill('Registered');
  await page.getByLabel('Last name').fill('Administrator');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Username').fill(username);
  await page.locator('#registerPassword').fill('StrongPass1!');
  await page.locator('#confirmPassword').fill('StrongPass1!');
  await page.locator('#confirmPassword').press('Enter');
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await expect(page.getByText('Registration completed successfully. Please sign in.')).toBeVisible();
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill('StrongPass1!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  const users = await request.get('/api/adminUsers');
  const records = (await users.json());
  const registered = records.find((user) => user.email === email);
  expect(registered).toBeTruthy();
  expect(registered.role).toBe('Admin');
  expect(registered.password).toBeUndefined();
  expect(registered.passwordHash).toBeUndefined();
  await request.delete(`/api/adminUsers/${registered.id}`);
});
