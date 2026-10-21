import { useEffect, useState } from 'react';
import Button from '@/components/ui/button';
import Dialog from '@/components/ui/dialog';
import { Field } from '@/components/ui/form';
import { useLanguage } from '@/context/LanguageContext';

type ConfirmProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({ open, title, message, confirmLabel, danger, onConfirm, onClose }: ConfirmProps) {
  const { t } = useLanguage();
  return (
    <Dialog
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p style={{ margin: 0 }}>{message}</p>
    </Dialog>
  );
}

type ReasonProps = Omit<ConfirmProps, 'onConfirm'> & { onConfirm: (reason: string) => void };

/** Asks for a reason first (saved in the audit log): cancel, refund, pause… */
export function ReasonDialog({ open, title, message, confirmLabel, danger = true, onConfirm, onClose }: ReasonProps) {
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (open) setReason('');
  }, [open]);
  return (
    <Dialog
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.back')}</Button>
          <Button variant={danger ? 'danger' : 'primary'} disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <p className="muted" style={{ marginTop: 0 }}>{message}</p>}
      <Field label={t('common.reason')}>
        <textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
      </Field>
    </Dialog>
  );
}
