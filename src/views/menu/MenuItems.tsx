import { useState } from 'react';
import Button from '@/components/ui/button';
import { Card, Empty } from '@/components/ui/card';
import Dialog from '@/components/ui/dialog';
import { Field, SearchBox } from '@/components/ui/form';
import Spinner from '@/components/ui/spinner';
import DishImage from '@/components/shared/DishImage';
import PageHeader from '@/components/shared/PageHeader';
import { Badge } from '@/components/shared/StatusBadge';
import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/context/UserDataContext';
import { useAction } from '@/hooks/useAction';
import { useApi } from '@/hooks/useApi';
import { apiGetSettings } from '@/services/BusinessService';
import { apiDeleteCategory, apiGetCategories, apiGetMenuItems, apiSaveCategory, apiSaveMenuItem, apiSetItemAvailability } from '@/services/MenuItemService';
import type { MenuItem, MenuItemSaveRequest } from '@/types/menuItem';

export default function MenuItems() {
  const { t } = useLanguage();
  const { canPage, money } = useUserData();
  const { run, busy } = useAction();
  const items = useApi(apiGetMenuItems);
  const categories = useApi(apiGetCategories);
  const settings = useApi(apiGetSettings);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<number | ''>('');
  const [form, setForm] = useState<MenuItemSaveRequest | null>(null);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [newGroup, setNewGroup] = useState('');

  if (!items.data || !categories.data || !settings.data) return <Spinner />;
  const canAdd = canPage('MENU', 'add');
  const canEdit = canPage('MENU', 'edit');
  const groupName = (id: number | null) => categories.data?.find((c) => c.categoryId === id)?.categoryName ?? t('menu.noGroup');
  const rows = items.data
    .filter((p) => (canEdit || p.isAvailable) && (category === '' || p.categoryId === category))
    .filter((p) => !q || `${p.itemName} ${p.itemCode}`.toLowerCase().includes(q.toLowerCase()));

  const blank: MenuItemSaveRequest = {
    categoryId: categories.data[0]?.categoryId ?? null,
    itemCode: '',
    itemName: '',
    imageUrl: '',
    unitName: 'plate',
    price: 0,
    taxRate: settings.data.defaultTaxRate,
    isVeg: true,
    isAvailable: true,
  };
  const edit = (p: MenuItem) => setForm({ ...p });
  const set = <K extends keyof MenuItemSaveRequest>(k: K, v: MenuItemSaveRequest[K]) => form && setForm({ ...form, [k]: v });

  const save = async () => {
    if (form && (await run(() => apiSaveMenuItem(form), t('menu.saved')))) {
      setForm(null);
      items.reload();
    }
  };

  return (
    <>
      <PageHeader
        title={t('nav.items')}
        subtitle={t('menu.sub')}
        actions={
          canAdd && (
            <>
              <Button variant="ghost" onClick={() => setGroupsOpen(true)}>
                {t('menu.groups')}
              </Button>
              <Button icon="plus" onClick={() => setForm(blank)}>
                {t('menu.addDish')}
              </Button>
            </>
          )
        }
      />
      <Card pad={false}>
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} placeholder={t('menu.search')} />
          <select className="input" style={{ maxWidth: 200 }} value={category} onChange={(e) => setCategory(e.target.value ? Number(e.target.value) : '')}>
            <option value="">{t('menu.allGroups')}</option>
            {categories.data.map((c) => (
              <option key={c.categoryId} value={c.categoryId}>
                {c.categoryName}
              </option>
            ))}
          </select>
        </div>
        {rows.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('menu.dish')}</th>
                  <th>{t('menu.group')}</th>
                  <th className="num">{t('order.price')}</th>
                  <th className="num">GST</th>
                  <th>{t('dash.colStatus')}</th>
                  {canEdit && <th />}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.itemId} className={p.isAvailable ? '' : 'dim'}>
                    <td>
                      <div className="user-cell">
                        <DishImage name={p.itemName} imageUrl={p.imageUrl} w={96} h={96} className="item-thumb" />
                        <div>
                          <strong>{p.itemName}</strong>
                          <div className="muted small">
                            {p.itemCode} · {t('menu.per', { unit: p.unitName })}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{groupName(p.categoryId)}</td>
                    <td className="num">{money(p.price)}</td>
                    <td className="num">{p.taxRate}%</td>
                    <td>
                      <Badge tone={p.isAvailable ? 'success' : 'neutral'}>{p.isAvailable ? t('menu.available') : t('menu.soldOut')}</Badge>
                    </td>
                    {canEdit && (
                      <td className="row-actions">
                        <Button size="sm" variant="ghost" icon="edit" onClick={() => edit(p)}>
                          {t('common.edit')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => (await run(() => apiSetItemAvailability({ itemId: p.itemId, isAvailable: !p.isAvailable }))) && items.reload()}
                        >
                          {p.isAvailable ? t('menu.markSoldOut') : t('menu.markAvailable')}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="box" title={t('menu.none')} action={canAdd && <Button icon="plus" onClick={() => setForm(blank)}>{t('menu.addDish')}</Button>} />
        )}
      </Card>

      <Dialog
        open={!!form}
        title={form?.itemId ? t('menu.editDish') : t('menu.addDish')}
        onClose={() => setForm(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setForm(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} disabled={busy}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        {form && (
          <div className="form">
            <Field label={t('menu.dishName')}>
              <input className="input" value={form.itemName} onChange={(e) => set('itemName', e.target.value)} autoFocus placeholder={t('menu.dishNameHint')} />
            </Field>
            <div className="form-row">
              <Field label={t('menu.group')}>
                <select className="input" value={form.categoryId ?? ''} onChange={(e) => set('categoryId', e.target.value ? Number(e.target.value) : null)}>
                  <option value="">{t('menu.noGroup')}</option>
                  {categories.data?.map((c) => (
                    <option key={c.categoryId} value={c.categoryId}>
                      {c.categoryName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('menu.code')}>
                <input className="input" value={form.itemCode} onChange={(e) => set('itemCode', e.target.value)} />
              </Field>
            </div>
            <div className="form-row three">
              <Field label={`${t('order.price')} (₹)`}>
                <input className="input" type="number" min="0" step="0.5" value={form.price} onChange={(e) => set('price', Number(e.target.value))} />
              </Field>
              <Field label="GST %">
                <select className="input" value={form.taxRate} onChange={(e) => set('taxRate', Number(e.target.value))}>
                  {[0, 5, 12, 18, 28].map((r) => (
                    <option key={r} value={r}>
                      {r}%
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('menu.unit')}>
                <input className="input" value={form.unitName} onChange={(e) => set('unitName', e.target.value)} placeholder="plate, cup, pc" />
              </Field>
            </div>
            <Field label={t('menu.photo')} hint={t('menu.photoHint')}>
              <div className="photo-field">
                <DishImage name={form.itemName || '?'} imageUrl={form.imageUrl} w={120} h={120} className="item-thumb lg" />
                <input className="input" value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://…" />
              </div>
            </Field>
            <label className="check">
              <input type="checkbox" checked={form.isVeg} onChange={(e) => set('isVeg', e.target.checked)} /> {t('menu.veg')}
            </label>
            <label className="check">
              <input type="checkbox" checked={form.isAvailable} onChange={(e) => set('isAvailable', e.target.checked)} /> {t('menu.availableNow')}
            </label>
          </div>
        )}
      </Dialog>

      <Dialog open={groupsOpen} title={t('menu.groups')} onClose={() => setGroupsOpen(false)}>
        <div className="form">
          <ul className="cat-list">
            {categories.data.map((c) => (
              <li key={c.categoryId}>
                <span>{c.categoryName}</span>
                <Button
                  size="sm"
                  variant="ghost-danger"
                  icon="trash"
                  aria-label={t('common.delete')}
                  onClick={async () => (await run(() => apiDeleteCategory({ id: c.categoryId }), t('menu.groupRemoved'))) && categories.reload()}
                />
              </li>
            ))}
          </ul>
          <form
            className="customer-pick"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await run(() => apiSaveCategory({ categoryName: newGroup }), t('menu.groupAdded'))) {
                setNewGroup('');
                categories.reload();
              }
            }}
          >
            <input className="input" placeholder={t('menu.newGroup')} value={newGroup} onChange={(e) => setNewGroup(e.target.value)} />
            <Button type="submit" icon="plus">
              {t('common.add')}
            </Button>
          </form>
        </div>
      </Dialog>
    </>
  );
}
