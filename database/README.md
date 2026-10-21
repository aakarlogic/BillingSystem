# पावती (Pavti): database design

Files in this folder:

| File | What it is |
|---|---|
| [schema.sql](schema.sql) | `CREATE TABLE` for all 22 tables (MySQL 8) |
| [seed.sql](seed.sql) | Starting data: roles, pages, page rights, staff permissions, plans, first platform admin |

Run order: `schema.sql`, then `seed.sql`.

---

## 1. Rules used everywhere

**Five audit columns on every table**

| Column | Type | Meaning |
|---|---|---|
| `is_active` | TINYINT(1) | `1` = in use. `0` = deleted/disabled. We never really delete rows (soft delete). |
| `inserted_by` | BIGINT | `user_id` of the person who created the row (`NULL` = system) |
| `inserted_date` | DATETIME | When the row was created (filled automatically) |
| `updated_by` | BIGINT | `user_id` of the person who last changed the row |
| `updated_date` | DATETIME | When it was last changed (filled automatically) |

**No foreign keys.** A column like `business_id` or `item_id` holds the id of another table's row, but no
`FOREIGN KEY` constraint exists. The API (backend) must:

1. Check that the id exists **and** belongs to the same `business_id` before saving.
2. Never hard-delete. Set `is_active = 0` instead, so old ids stay valid.
3. Add `AND is_active = 1` when reading lists.

Indexes are still added on these id columns so lookups stay fast.

**One restaurant never sees another's data.** Every business table has `business_id`, and every query must
include `WHERE business_id = <logged-in user's business>`.

**Names, prices and tax are copied onto the bill** (`order_items`). Changing the menu later never changes an
old bill.

---

## 2. Tables at a glance

```
PLATFORM              ACCESS                    USERS & LOGIN
────────              ──────                    ─────────────
plans                 roles                     users
businesses            pages                     user_permissions
business_subscriptions role_page_rights         user_otps
                      permissions               user_sessions
                                                login_history

RESTAURANT SETUP      BILLING                   AUDIT
────────────────      ───────                   ─────
dining_tables         orders                    audit_logs
menu_categories       order_items
menu_items            payments
menu_item_price_history day_closings
customers
```

How the main ids connect (by value, no FK):

```
plans ─< businesses ─< users >─ roles ─< role_page_rights >─ pages
                │          └─< user_permissions >─ permissions
                ├─< dining_tables
                ├─< menu_categories ─< menu_items
                ├─< customers
                └─< orders ─< order_items   (item_id → menu_items)
                       └─< payments
```

`─<` means "one … has many …".

---

## 3. Every table explained

### Platform

| Table | Purpose | Important columns |
|---|---|---|
| **plans** | Plans you sell to businesses | `plan_code` (FREE/STARTER/GROWTH), `monthly_price`, `max_users`, `max_tables` |
| **businesses** | One row per restaurant/shop, plus its bill settings | `business_name`, `gstin`, `bill_prefix` + `next_bill_no` (bill numbering), `default_tax_rate`, `service_charge_pct`, `default_language`, `day_close_time`, `plan_id`, `status` (PENDING/ACTIVE/SUSPENDED) |
| **business_subscriptions** | History of a business's plan periods and payments to you | `plan_id`, `start_date`, `end_date`, `amount`, `payment_status` |

### Access (who can open what)

| Table | Purpose | Important columns |
|---|---|---|
| **roles** | The 3 roles | `role_code`: SUPER_ADMIN, OWNER, STAFF. `is_platform_role` = 1 for SUPER_ADMIN |
| **pages** | Every screen; the side menu is built from here | `page_code`, `route_path`, `menu_group`, `show_in_menu`, `required_permission_code`, names in mr/hi |
| **role_page_rights** | Which role can open which page and what it can do there | `role_id`, `page_id`, `can_view`, `can_add`, `can_edit`, `can_delete`, `can_export` |
| **permissions** | The tick boxes an owner gives each staff member | ORDERS_TAKE, PAYMENTS_TAKE, DISCOUNTS_GIVE, BILLS_CANCEL, SALES_VIEW |

### Users and login

| Table | Purpose | Important columns |
|---|---|---|
| **users** | Everyone who can sign in | `business_id` (NULL for platform admin), `role_id`, `mobile_no` (login id, unique), `password_hash`, `login_pin_hash` (optional quick PIN for staff), `preferred_language`, `failed_login_count`, `locked_until`, `must_change_password` |
| **user_permissions** | The ticks for each staff member | `user_id`, `permission_id`, `is_allowed` |
| **user_otps** | OTP codes for sign-up and forgot password | `mobile_no`, `purpose` (REGISTER/RESET_PASSWORD/LOGIN), `otp_hash`, `expires_at`, `attempts` |
| **user_sessions** | Logged-in devices | `token_hash`, `device_name`, `expires_at`, `logout_date`. Set `is_active = 0` to sign a device out |
| **login_history** | Every sign-in attempt | `login_id_entered`, `is_success`, `failure_reason`, `ip_address` |

### Restaurant setup

| Table | Purpose | Important columns |
|---|---|---|
| **dining_tables** | Table 1, Table 2 … | `table_name`, `area_name`, `seats`, `table_status` (AVAILABLE/OCCUPIED/BILL_PENDING), `current_order_id` |
| **menu_categories** | Starters, South Indian, Drinks … | `category_name` (+ mr/hi), `sort_order` |
| **menu_items** | Dishes. **This is where the owner adds a dish.** | `category_id`, `item_name` (+ mr/hi), `image_url`, `unit_name`, `price`, `tax_rate`, `is_veg`, `is_available` (0 = sold out today) |
| **menu_item_price_history** | Every price change | `old_price`, `new_price`, `changed_date` |
| **customers** | Regular customers (optional) | `customer_name`, `mobile_no`, `gstin` |

### Billing

| Table | Purpose | Important columns |
|---|---|---|
| **orders** | One order = one bill | `bill_no`, `order_type` (DINE_IN/TAKEAWAY/COUNTER), `table_id`, `order_status`, `business_date`, `sub_total`, `discount_*`, `tax_amount`, `service_charge_amount`, `total_amount`, `paid_amount`, `balance_amount`, `waiter_user_id`, `billed_by`, `cancel_reason` |
| **order_items** | Dishes on the bill (copied at time of sale) | `item_id`, `item_name`, `quantity`, `unit_price`, `tax_rate`, `line_total`, `kitchen_note` |
| **payments** | Money marked as received (cash or UPI) or refunded | `payment_type` (PAYMENT/REFUND), `payment_mode` (CASH/UPI), `amount`, `cash_received`, `change_returned`, `request_key` (stops double taps), `reason` |
| **day_closings** | End-of-day cash check | `cash_expected`, `cash_counted`, `cash_difference`, `upi_total`, `unpaid_total` |

### Audit

| Table | Purpose | Important columns |
|---|---|---|
| **audit_logs** | Who did what, when and why | `action_code` (BILL_CANCEL, DISCOUNT_GIVEN, PRICE_CHANGE, LOGIN …), `entity_name`, `entity_id`, `old_value`, `new_value`, `reason` |

---

## 4. Role page rights (from `seed.sql`)

V = view, A = add, E = edit, D = delete, X = export. A dash means the page is not shown.

| Page | Platform Admin | Owner | Staff | Staff also needs tick |
|---|---|---|---|---|
| Businesses | V A E D X | – | – | |
| Plans | V A E D | – | – | |
| All users | V A E D X | – | – | |
| Home | V | V | V | |
| New bill | – | V A | V A | Take orders |
| Tables | – | V A E D | V | |
| Bills | – | V A E D X | V A E | |
| Payments | – | V A E X | V A | Take payments |
| Menu & products | – | V A E D X | V | |
| Menu categories | – | V A E D | – | |
| Customers | – | V A E D X | V A E | |
| Reports | – | V X | V | See sales |
| Close day | – | V A E X | – | |
| Team | – | V A E D | – | |
| Settings | – | V E | – | |
| History (audit log) | V X | V X | – | |
| My profile | V E | V E | V E | |
| Help guide | V | V | V | |

**How access is decided**

```
Can this user open this page?
 = the user is active
 AND their role has can_view = 1 for the page in role_page_rights
 AND ( role is not STAFF
       OR the page has no required_permission_code
       OR the staff member has that permission ticked in user_permissions )
```

The same idea applies to actions. For example, a staff member can give a discount only with the
`DISCOUNTS_GIVE` tick. **Always check on the server**: hiding a button is not enough.

Menu query (used to build the side menu after login):

```sql
SELECT p.page_code, p.page_name, p.page_name_mr, p.route_path, p.menu_group, p.icon_name,
       rp.can_add, rp.can_edit, rp.can_delete, rp.can_export
FROM users u
JOIN roles r             ON r.role_id = u.role_id AND r.is_active = 1
JOIN role_page_rights rp ON rp.role_id = u.role_id AND rp.is_active = 1 AND rp.can_view = 1
JOIN pages p             ON p.page_id = rp.page_id AND p.is_active = 1 AND p.show_in_menu = 1
WHERE u.user_id = ? AND u.is_active = 1
  AND ( r.role_code <> 'STAFF'
        OR p.required_permission_code IS NULL
        OR EXISTS (SELECT 1 FROM user_permissions up
                   JOIN permissions pm ON pm.permission_id = up.permission_id
                   WHERE up.user_id = u.user_id AND up.is_active = 1 AND up.is_allowed = 1
                     AND pm.permission_code = p.required_permission_code) )
ORDER BY p.sort_order;
```

(Tested: a waiter with only "Take orders" gets Home, New bill, Tables, Bills, Menu, Customers, Profile and Guide.
No Payments, no Reports.)

---

## 5. Main flows

### A. Owner registers a new restaurant

1. Owner enters mobile number → row in `user_otps` (purpose `REGISTER`), OTP sent by SMS.
2. Owner enters the OTP → check `otp_hash`, `expires_at`, `attempts`; set `used_date`.
3. Owner enters restaurant name, own name, password → in one transaction:
   - `businesses`: new row, `status = 'ACTIVE'` (or `PENDING` if you approve sign-ups by hand), `plan_id` = FREE
   - `users`: owner row with `role_id` = OWNER, `password_hash` = bcrypt, `is_mobile_verified = 1`
   - `business_subscriptions`: first FREE period
   - `audit_logs`: `BUSINESS_REGISTER`
4. Setup checklist: add `menu_categories`, `menu_items` and `dining_tables`, then add staff.

### B. Owner adds a staff member

1. Check seat limit: active users of this business < `plans.max_users`.
2. `users`: new row with `role_id` = STAFF, `must_change_password = 1`.
3. `user_permissions`: one row per ticked box (defaults come from `permissions.default_for_staff`).

### C. Login

1. Find `users` by `mobile_no` (or email) where `is_active = 1`.
2. If `locked_until` is in the future → stop.
3. Compare password with `password_hash`.
   - Wrong: `failed_login_count + 1` (lock for 15 minutes after 5 tries), add a `login_history` row with `is_success = 0`.
4. If the user has a `business_id`, check `businesses.status = 'ACTIVE'`.
5. Success: reset `failed_login_count`, set `last_login_date`, add `user_sessions` and `login_history` rows.
6. Load the side menu with the query in section 4.
7. If `must_change_password = 1`, show the change-password screen first.

### D. Order → bill → paid (restaurant)

| Step | Who | What changes |
|---|---|---|
| Waiter opens Table 4 | Staff (ORDERS_TAKE) | `orders` row with `order_status = 'OPEN'`, `table_id`. `dining_tables.table_status = 'OCCUPIED'`, `current_order_id` set |
| Adds dishes | Staff | `order_items` rows (name, price, tax copied from `menu_items`). Order totals recalculated |
| Make bill | Cashier or owner | `bill_no` = `bill_prefix` + `next_bill_no` (then `next_bill_no + 1`, in the same transaction). `order_status = 'BILLED'`, `billed_by`, `billed_date`. Table → `BILL_PENDING` |
| Paid by cash/UPI | Staff (PAYMENTS_TAKE) | `payments` row. `paid_amount`, `balance_amount` updated. When balance = 0: `order_status = 'PAID'`, `paid_date`, table → `AVAILABLE`, `current_order_id = NULL` |
| Cancel (mistake) | Owner or staff with BILLS_CANCEL | `order_status = 'CANCELLED'`, `cancel_reason`, `audit_logs` row. Only if nothing is paid |
| Refund | Owner | `payments` row with `payment_type = 'REFUND'`, `reason`, `audit_logs` row |

`business_date` uses `businesses.day_close_time`. With 04:00, a bill at 1:30 AM still counts for the previous day.

### E. Close the day

1. Sum `payments` for the `business_date`, grouped by `payment_mode`.
2. Owner types the cash counted.
3. Save `day_closings` with expected, counted and difference.

---

## 6. Backend checklist (because there are no foreign keys)

- Every `INSERT`/`UPDATE` that stores an `_id` first checks that the row exists, `is_active = 1`, and has the same `business_id`.
- Every `SELECT` on business data has `WHERE business_id = ?` from the logged-in user, never from the browser.
- Making a bill (bill number + status + table) and saving a payment run inside one transaction.
- `payments.request_key` is unique per business, so a double tap can't save the same payment twice.
- Passwords, PINs, OTPs and session tokens are stored only as hashes.
- Optional: a nightly job that finds orphan ids (for example `order_items.order_id` with no order) and reports them.
