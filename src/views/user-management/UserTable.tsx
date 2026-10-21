import { useState } from 'react';
import Button from '@/components/ui/button';
import { Empty } from '@/components/ui/card';
import Dialog from '@/components/ui/dialog';
import { Field, SearchBox } from '@/components/ui/form';
import StatusBadge from '@/components/shared/StatusBadge';
import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/context/UserDataContext';
import { useAction } from '@/hooks/useAction';
import { apiSaveUser, apiSetUserStatus } from '@/services/UserMasterService';
import { PERMISSION_CODES, type PermissionCode, type RoleCode } from '@/types/auth';
import type { BusinessListItem } from '@/types/business';
import type { User, UserSaveRequest } from '@/types/user';
import { formatDateTime } from '@/utils/formatDate';
import { initials } from '@/utils/money';

type UserTableProps = { users: User[]; businesses?: BusinessListItem[]; onChanged: () => void };

/** Shared by the owner's Team page and the platform admin's All users page. */
export default function UserTable({ users, businesses, onChanged }: UserTableProps) {
  const { t } = useLanguage();
  const { user: me } = useUserData();
  const { run, busy } = useAction();
  const isPlatform = !!businesses;
  const [q, setQ] = useState('');
  const [role, setRole] = useState<RoleCode | ''>('');
  const [form, setForm] = useState<UserSaveRequest | null>(null);

  const rows = users.filter(
    (u) => (!role || u.roleCode === role) && (!q || [u.fullName, u.mobileNo, u.email, u.businessName].join(' ').toLowerCase().includes(q.toLowerCase())),
  );
  const roles: RoleCode[] = isPlatform ? ['SUPER_ADMIN', 'OWNER', 'STAFF'] : ['OWNER', 'STAFF'];
  const blank = (): UserSaveRequest => ({
    roleCode: 'STAFF',
    fullName: '',
    mobileNo: '',
    email: '',
    password: '',
    permissions: ['ORDERS_TAKE'],
    businessId: businesses?.[0]?.businessId ?? null,
  });
  const set = <K extends keyof UserSaveRequest>(k: K, v: UserSaveRequest[K]) => form && setForm({ ...form, [k]: v });
  const togglePerm = (p: PermissionCode, on: boolean) =>
    form && setForm({ ...form, permissions: on ? [...form.permissions, p] : form.permissions.filter((x) => x !== p) });

  const save = async () => {
    if (form && (await run(() => apiSaveUser(form), form.userId ? t('team.updated') : t('team.created')))) {
      setForm(null);
      onChanged();
    }
  };

  return (
    <>
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder={t('team.search')} />
        <select className="input" style={{ maxWidth: 170 }} value={role} onChange={(e) => setRole(e.target.value as RoleCode | '')}>
          <option value="">{t('team.allRoles')}</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {t(`roleCode.${r}`)}
            </option>
          ))}
        </select>
        <div className="spacer" />
        <Button icon="plus" onClick={() => setForm(blank())}>
          {isPlatform ? t('team.addUser') : t('team.addStaff')}
        </Button>
      </div>
      {rows.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('team.colPerson')}</th>
                {isPlatform && <th>{t('dash.businesses')}</th>}
                <th>{t('team.colRole')}</th>
                <th>{t('team.colAccess')}</th>
                <th>{t('team.colLastSeen')}</th>
                <th>{t('dash.colStatus')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.userId}>
                  <td>
                    <div className="user-cell">
                      <div className="avatar sm">{initials(u.fullName)}</div>
                      <div>
                        <strong>{u.fullName}</strong>
                        <div className="muted small">{u.mobileNo}</div>
                      </div>
                    </div>
                  </td>
                  {isPlatform && <td>{u.businessName ?? '—'}</td>}
                  <td>
                    <span className={`role-pill role-${u.roleCode}`}>{t(`roleCode.${u.roleCode}`)}</span>
                  </td>
                  <td>
                    {u.roleCode === 'STAFF' ? (
                      <div className="perm-chips">
                        {u.permissions.map((p) => (
                          <span key={p} className="perm-chip">
                            {t(`perm.${p}.short`)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="muted">{t('team.fullAccess')}</span>
                    )}
                  </td>
                  <td className="nowrap">{formatDateTime(u.lastLoginDate)}</td>
                  <td>
                    <StatusBadge status={u.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  </td>
                  <td className="row-actions">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="edit"
                      onClick={() =>
                        setForm({
                          userId: u.userId,
                          businessId: u.businessId,
                          roleCode: u.roleCode,
                          fullName: u.fullName,
                          mobileNo: u.mobileNo,
                          email: u.email,
                          password: '',
                          permissions: u.permissions,
                        })
                      }
                    >
                      {t('common.edit')}
                    </Button>
                    {u.userId !== me?.userId && (
                      <Button
                        size="sm"
                        variant={u.isActive ? 'ghost-danger' : 'ghost'}
                        onClick={async () =>
                          (await run(() => apiSetUserStatus({ userId: u.userId, isActive: !u.isActive }), u.isActive ? t('team.deactivated') : t('team.activated'))) &&
                          onChanged()
                        }
                      >
                        {u.isActive ? t('team.deactivate') : t('team.activate')}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon="users" title={t('team.none')} />
      )}

      <Dialog
        open={!!form}
        title={form?.userId ? t('team.editTitle') : isPlatform ? t('team.addUser') : t('team.addStaff')}
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
            <div className="form-row">
              <Field label={t('team.name')}>
                <input className="input" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} autoFocus />
              </Field>
              <Field label={t('login.mobile')}>
                <input className="input" inputMode="tel" value={form.mobileNo} onChange={(e) => set('mobileNo', e.target.value)} />
              </Field>
            </div>
            <Field label={`${t('customers.email')} (${t('common.optional')})`}>
              <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <div className="form-row">
              <Field label={t('team.colRole')}>
                <select className="input" value={form.roleCode} onChange={(e) => set('roleCode', e.target.value as RoleCode)} disabled={form.userId === me?.userId}>
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {t(`roleCode.${r}`)}
                    </option>
                  ))}
                </select>
              </Field>
              {isPlatform && form.roleCode !== 'SUPER_ADMIN' && (
                <Field label={t('dash.businesses')}>
                  <select className="input" value={form.businessId ?? ''} onChange={(e) => set('businessId', Number(e.target.value))}>
                    {businesses?.map((b) => (
                      <option key={b.businessId} value={b.businessId}>
                        {b.businessName}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
            <Field label={form.userId ? t('team.newPassword') : t('login.password')} hint={t('team.passwordHint')}>
              <input className="input" type="password" value={form.password ?? ''} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" />
            </Field>
            {form.roleCode === 'STAFF' ? (
              <fieldset className="perm-box">
                <legend>{t('team.whatCan')}</legend>
                {PERMISSION_CODES.map((p) => (
                  <label key={p} className="perm-row">
                    <input type="checkbox" checked={form.permissions.includes(p)} onChange={(e) => togglePerm(p, e.target.checked)} />
                    <span>
                      <strong>{t(`perm.${p}.label`)}</strong>
                      <small>{t(`perm.${p}.hint`)}</small>
                    </span>
                  </label>
                ))}
              </fieldset>
            ) : (
              <div className="role-help">
                <strong>{t(`roleCode.${form.roleCode}`)}:</strong> {t(`roleHelp.${form.roleCode}`)}
              </div>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}
