import type { ButtonHTMLAttributes } from 'react';
import Icon from './icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ghost-danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm';
  icon?: string;
};

export default function Button({ variant = 'primary', size, icon, children, className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={`btn btn-${variant} ${size ? `btn-${size}` : ''} ${className}`} {...props}>
      {icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children}
    </button>
  );
}
