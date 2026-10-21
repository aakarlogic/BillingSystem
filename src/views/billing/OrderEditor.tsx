import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import Button from '@/components/ui/button';
import { Card, Empty } from '@/components/ui/card';
import Dialog from '@/components/ui/dialog';
import { Field, SearchBox } from '@/components/ui/form';
import Icon from '@/components/ui/icon';
import Spinner from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import DishImage from '@/components/shared/DishImage';
import PageHeader from '@/components/shared/PageHeader';
import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/context/UserDataContext';
import { useAction } from '@/hooks/useAction';
import { useApi } from '@/hooks/useApi';
import { apiGetSettings } from '@/services/BusinessService';
import { apiGetCustomers, apiSaveCustomer } from '@/services/CustomerService';
import { apiGetCategories, apiGetMenuItems } from '@/services/MenuItemService';
import { apiGetOrder, apiSaveOrder } from '@/services/OrderService';
import { apiGetTableFloor } from '@/services/TableService';
import type { Business } from '@/types/business';
import type { CustomerListItem } from '@/types/customer';
import type { MenuCategory, MenuItem } from '@/types/menuItem';
import type { DiscountType, Order } from '@/types/order';
import type { TableCard } from '@/types/table';
import { calculateBill } from '@/utils/billing';
import { formatQty } from '@/utils/money';

type Line = { key: number; itemId: number | null; itemName: string; unitName: string; quantity: number; unitPrice: number; taxRate: number };
type SubmitMode = 'draft' | 'bill' | 'collect';

let keySeq = 0;
const nextKey = () => ++keySeq;

type EditorData = {
  settings: Business;
  items: MenuItem[];
  categories: MenuCategory[];
  customers: CustomerListItem[];
  tables: TableCard[];
  order: Order | null;
};

/** Loads everything the order screen needs, then shows the editor. */
export default function OrderEditor() {
  const { id } = useParams();
  const { canPage } = useUserData();
  const { data, error } = useApi<EditorData>(async () => {
    const [settings, items, categories, customers, tables, detail] = await Promise.all([
      apiGetSettings(),
      apiGetMenuItems(),
      apiGetCategories(),
      apiGetCustomers(),
      canPage('TABLES') ? apiGetTableFloor() : Promise.resolve([]),
      id ? apiGetOrder({ id: Number(id) }) : Promise.resolve(null),
    ]);
    return { settings, items, categories, customers, tables, order: detail?.order ?? null };
  }, [id]);

  if (error) return <div className="error-box">{error}</div>;
  if (!data) return <Spinner />;
  return <Editor key={id ?? 'new'} data={data} />;
}

function Editor({ data }: { data: EditorData }) {
  const { settings, items, categories, customers, tables, order } = data;
  const { t } = useLanguage();
  const { user, can, canPage, money } = useUserData();
  const navigate = useNavigate();
  const toast = useToast();
  const { run, busy } = useAction();
  const [params] = useSearchParams();

  const isOwner = user?.roleCode !== 'STAFF';
  const canDiscount = can('DISCOUNTS_GIVE');
  const takeaway = customers.find((c) => /takeaway|counter/i.test(c.customerName));

  // "Bill to" is a table (T:id) or a customer (C:id)
  const initialTarget = order
    ? order.tableId
      ? `T:${order.tableId}`
      : order.customerId
        ? `C:${order.customerId}`
        : ''
    : params.get('table')
      ? `T:${params.get('table')}`
      : takeaway
        ? `C:${takeaway.customerId}`
        : '';
  const [target, setTarget] = useState(initialTarget);
  const [customerList, setCustomerList] = useState(customers);
  const [lines, setLines] = useState<Line[]>(() =>
    (order?.items ?? []).map((l) => ({
      key: nextKey(),
      itemId: l.itemId,
      itemName: l.itemName,
      unitName: l.unitName,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxRate: l.taxRate,
    })),
  );
  const [discountType, setDiscountType] = useState<DiscountType>(order?.discountType ?? 'NONE');
  const [discountValue, setDiscountValue] = useState(order?.discountValue ? String(order.discountValue) : '');
  const [discountReason, setDiscountReason] = useState('');
  const [serviceChargePct, setServiceChargePct] = useState(order?.serviceChargePct ?? settings.serviceChargePct);
  const [notes, setNotes] = useState(order?.notes ?? '');
  const [category, setCategory] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [newCustomer, setNewCustomer] = useState<{ customerName: string; mobileNo: string } | null>(null);

  useEffect(() => {
    document.body.classList.add('has-pos-bar');
    return () => document.body.classList.remove('has-pos-bar');
  }, []);

  const freeTables = tables.filter((x) => x.tableStatus === 'AVAILABLE' || x.tableId === order?.tableId);
  const shown = items.filter(
    (p) => p.isAvailable && (category === null || p.categoryId === category) && (!q || `${p.itemName} ${p.itemCode}`.toLowerCase().includes(q.toLowerCase())),
  );
  const discount = discountType === 'NONE' ? 0 : Number(discountValue) || 0;
  const totals = useMemo(
    () => calculateBill({ lines, discountType, discountValue: discount, serviceChargePct }),
    [lines, discountType, discount, serviceChargePct],
  );
  const itemCount = lines.reduce((n, l) => n + (Number(l.quantity) || 0), 0);

  if (order && order.orderStatus !== 'OPEN') {
    return (
      <Empty
        icon="invoice"
        title={t('order.alreadyBilledTitle')}
        text={t('order.alreadyBilledText')}
        action={
          <Link to={`/billing/bills/${order.orderId}`}>
            <Button>{t('order.openBill')}</Button>
          </Link>
        }
      />
    );
  }


  const addItem = (p: MenuItem) =>
    setLines((ls) => {
      const found = ls.find((l) => l.itemId === p.itemId);
      if (found) return ls.map((l) => (l === found ? { ...l, quantity: l.quantity + 1 } : l));
      return [...ls, { key: nextKey(), itemId: p.itemId, itemName: p.itemName, unitName: p.unitName, quantity: 1, unitPrice: p.price, taxRate: p.taxRate }];
    });
  const addCustom = () =>
    setLines((ls) => [...ls, { key: nextKey(), itemId: null, itemName: '', unitName: 'pc', quantity: 1, unitPrice: 0, taxRate: settings.defaultTaxRate }]);
  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const remove = (key: number) => setLines((ls) => ls.filter((l) => l.key !== key));

  const submit = async (mode: SubmitMode) => {
    const [kind, rawId] = target.split(':');
    const tableId = kind === 'T' ? Number(rawId) : null;
    const saved = await run(() =>
      apiSaveOrder({
        orderId: order?.orderId,
        orderType: tableId ? 'DINE_IN' : 'TAKEAWAY',
        tableId,
        customerId: kind === 'C' ? Number(rawId) : null,
        lines: lines.map(({ itemId, itemName, quantity, unitPrice, taxRate }) => ({ itemId, itemName, quantity, unitPrice, taxRate })),
        discountType: discount > 0 ? discountType : 'NONE',
        discountValue: discount,
        discountReason,
        serviceChargePct,
        notes,
        makeBill: mode !== 'draft',
      }),
    );
    if (!saved) return;
    if (mode === 'draft' && saved.tableId && canPage('TABLES')) {
      toast.success(t('order.saved', { name: saved.tableName ?? '' }));
      navigate('/tables', { replace: true });
    } else {
      if (mode === 'draft') toast.success(t('order.saved', { name: saved.customerName }));
      navigate(`/billing/bills/${saved.orderId}${mode === 'collect' ? '?pay=1' : ''}`, { replace: true });
    }
  };

  const saveCustomer = async () => {
    if (!newCustomer) return;
    const customerId = await run(
      () => apiSaveCustomer({ ...newCustomer, email: '', addressLine: '', gstin: '' }),
      t('order.customerAdded'),
    );
    if (customerId) {
      setCustomerList((cs) => [...cs, { customerId, businessId: 0, ...newCustomer, email: '', addressLine: '', gstin: '', billCount: 0, billed: 0, balance: 0 }]);
      setTarget(`C:${customerId}`);
      setNewCustomer(null);
    }
  };

  const actions = (
    <>
      <Button variant="ghost" onClick={() => submit('draft')} disabled={!lines.length || busy}>
        {t('order.save')}
      </Button>
      {can('PAYMENTS_TAKE') ? (
        <Button onClick={() => submit('collect')} disabled={!lines.length || busy} icon="wallet">
          {t('order.billPay')}
        </Button>
      ) : (
        <Button onClick={() => submit('bill')} disabled={!lines.length || busy}>
          {t('order.bill')}
        </Button>
      )}
    </>
  );

  return (
    <>
      <PageHeader
        title={order ? `${order.tableName ?? order.customerName} · ${t('statusCode.OPEN')}` : t('nav.newInvoice')}
        subtitle={t('order.sub')}
        back={{ to: canPage('TABLES') ? '/tables' : '/billing/bills', label: canPage('TABLES') ? t('nav.tables') : t('nav.invoices') }}
      />
      <div className="pos">
        <Card className="pos-catalog" pad={false}>
          <div className="toolbar">
            <SearchBox value={q} onChange={setQ} placeholder={t('order.search')} />
          </div>
          <div className="chips">
            <button type="button" className={`chip ${category === null ? 'active' : ''}`} onClick={() => setCategory(null)}>
              {t('order.all')}
            </button>
            {categories.map((c) => (
              <button key={c.categoryId} type="button" className={`chip ${category === c.categoryId ? 'active' : ''}`} onClick={() => setCategory(c.categoryId)}>
                {c.categoryName}
              </button>
            ))}
          </div>
          <div className="product-grid">
            {shown.map((p) => {
              const inCart = lines.find((l) => l.itemId === p.itemId);
              return (
                <button key={p.itemId} type="button" className={`product has-img ${inCart ? 'in-cart' : ''}`} onClick={() => addItem(p)}>
                  <DishImage name={p.itemName} imageUrl={p.imageUrl} w={300} h={200} className="product-img" />
                  {inCart && <span className="product-qty">{formatQty(inCart.quantity)}</span>}
                  <span className="product-body">
                    <span className="product-name">{p.itemName}</span>
                    <span className="product-price">
                      {money(p.price)}
                      <small>/{p.unitName}</small>
                    </span>
                  </span>
                  <span className="product-add" aria-hidden="true">
                    +
                  </span>
                </button>
              );
            })}
            {!shown.length && (
              <p className="muted pad">
                {t('order.noMatch')}{' '}
                {canPage('MENU', 'add') && (
                  <Link className="link" to="/menu">
                    {t('order.addDishes')}
                  </Link>
                )}
              </p>
            )}
          </div>
        </Card>

        <div className="pos-side">
          <Card title={t('order.billTo')}>
            <div className="customer-pick">
              <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
                {freeTables.length > 0 && (
                  <optgroup label={t('nav.tables')}>
                    {freeTables.map((x) => (
                      <option key={x.tableId} value={`T:${x.tableId}`}>
                        {x.tableName}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label={t('order.customers')}>
                  {customerList.map((c) => (
                    <option key={c.customerId} value={`C:${c.customerId}`}>
                      {c.customerName}
                      {c.mobileNo ? ` · ${c.mobileNo}` : ''}
                    </option>
                  ))}
                </optgroup>
              </select>
              {canPage('CUSTOMERS', 'add') && (
                <Button variant="ghost" icon="plus" onClick={() => setNewCustomer({ customerName: '', mobileNo: '' })} aria-label={t('order.newCustomer')} />
              )}
            </div>
          </Card>

          <Card
            title={`${t('order.items', { n: itemCount })}`}
            actions={isOwner && <Button size="sm" variant="ghost" icon="plus" onClick={addCustom}>{t('order.customLine')}</Button>}
            pad={false}
          >
            {lines.length ? (
              <div className="cart">
                {lines.map((l) => (
                  <div key={l.key} className="cart-line">
                    <div className="cart-main">
                      {l.itemId ? (
                        <span className="cart-name">
                          <DishImage name={l.itemName} imageUrl={items.find((p) => p.itemId === l.itemId)?.imageUrl} w={64} h={64} className="cart-thumb" />
                          <strong>{l.itemName}</strong>
                        </span>
                      ) : (
                        <input className="input sm" placeholder={t('order.lineName')} value={l.itemName} onChange={(e) => update(l.key, { itemName: e.target.value })} />
                      )}
                      <div className="cart-sub">
                        {isOwner ? (
                          <input
                            className="input sm price-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={l.unitPrice}
                            onChange={(e) => update(l.key, { unitPrice: Number(e.target.value) })}
                            aria-label={t('order.price')}
                          />
                        ) : (
                          <span>{money(l.unitPrice)}</span>
                        )}
                        {!l.itemId ? (
                          <select className="input sm" value={l.taxRate} onChange={(e) => update(l.key, { taxRate: Number(e.target.value) })} aria-label={t('order.tax')}>
                            {[0, 5, 12, 18, 28].map((r) => (
                              <option key={r} value={r}>
                                GST {r}%
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="muted">GST {l.taxRate}%</span>
                        )}
                      </div>
                    </div>
                    <div className="qty">
                      <button type="button" onClick={() => (l.quantity <= 1 ? remove(l.key) : update(l.key, { quantity: l.quantity - 1 }))} aria-label="−">
                        <Icon name="minus" size={14} />
                      </button>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={l.quantity}
                        onChange={(e) => update(l.key, { quantity: e.target.value === '' ? 0 : Number(e.target.value) })}
                        aria-label={t('order.qty')}
                      />
                      <button type="button" onClick={() => update(l.key, { quantity: l.quantity + 1 })} aria-label="+">
                        <Icon name="plus" size={14} />
                      </button>
                    </div>
                    <div className="cart-amt">{money(l.quantity * l.unitPrice)}</div>
                    <button type="button" className="icon-btn danger" onClick={() => remove(l.key)} aria-label={t('order.removeLine')}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted pad center">{t('order.tapToAdd')}</p>
            )}
          </Card>

          <Card title={t('order.adjustments')}>
            <div className="form">
              {canDiscount ? (
                <div className="form-row">
                  <Field label={t('order.discount')}>
                    <select className="input" value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
                      <option value="NONE">{t('order.noDiscount')}</option>
                      <option value="PERCENT">{t('order.percent')}</option>
                      <option value="AMOUNT">{t('order.amount')}</option>
                    </select>
                  </Field>
                  {discountType !== 'NONE' && (
                    <Field label={discountType === 'PERCENT' ? '%' : '₹'}>
                      <input className="input" type="number" min="0" step="0.01" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
                    </Field>
                  )}
                </div>
              ) : (
                <p className="muted small" style={{ margin: 0 }}>
                  {t('order.noDiscountRight')}
                </p>
              )}
              {discountType !== 'NONE' && canDiscount && (
                <Field label={t('order.discountReason')}>
                  <input className="input" value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} />
                </Field>
              )}
              <Field label={`${settings.serviceChargeLabel} (%)`}>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.5"
                  value={serviceChargePct}
                  onChange={(e) => setServiceChargePct(Number(e.target.value))}
                  disabled={!isOwner}
                />
              </Field>
              <Field label={t('order.notes')}>
                <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('order.notesHint')} />
              </Field>
            </div>
          </Card>

          <Card className="totals-card">
            <div className="totals">
              <div>
                <span>{t('order.subtotal')}</span>
                <span>{money(totals.subTotal)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="neg">
                  <span>{t('order.discount')}</span>
                  <span>−{money(totals.discountAmount)}</span>
                </div>
              )}
              {totals.taxLines.map((x) => (
                <div key={x.taxRate} className="muted">
                  <span>
                    GST {x.taxRate}% · {money(x.taxable)}
                  </span>
                  <span>{money(x.tax)}</span>
                </div>
              ))}
              {totals.serviceChargeAmount > 0 && (
                <div>
                  <span>
                    {settings.serviceChargeLabel} {serviceChargePct}%
                  </span>
                  <span>{money(totals.serviceChargeAmount)}</span>
                </div>
              )}
              <div className="grand">
                <span>{t('order.total')}</span>
                <span>{money(totals.totalAmount)}</span>
              </div>
            </div>
            <div className="pos-actions">{actions}</div>
          </Card>
        </div>
      </div>

      <div className="pos-bar">
        <div className="pos-bar-total">
          <small>
            {t('order.items', { n: itemCount })} · {t('order.total')}
          </small>
          <strong>{money(totals.totalAmount)}</strong>
        </div>
        {actions}
      </div>

      <Dialog
        open={!!newCustomer}
        title={t('order.newCustomer')}
        onClose={() => setNewCustomer(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewCustomer(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={saveCustomer} disabled={busy}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        {newCustomer && (
          <div className="form">
            <Field label={t('customers.name')}>
              <input className="input" value={newCustomer.customerName} onChange={(e) => setNewCustomer({ ...newCustomer, customerName: e.target.value })} autoFocus />
            </Field>
            <Field label={t('customers.mobile')}>
              <input className="input" inputMode="tel" value={newCustomer.mobileNo} onChange={(e) => setNewCustomer({ ...newCustomer, mobileNo: e.target.value })} />
            </Field>
          </div>
        )}
      </Dialog>
    </>
  );
}
