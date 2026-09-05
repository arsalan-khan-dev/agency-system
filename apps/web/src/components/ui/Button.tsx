import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-[#04101f] hover:brightness-110 disabled:opacity-50',
  secondary:
    'bg-surface-elevated text-text border border-border hover:border-primary disabled:opacity-50',
  danger: 'bg-danger text-white hover:brightness-110 disabled:opacity-50',
  ghost: 'text-text-muted hover:text-text disabled:opacity-50',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className = '', ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary ${variantClasses[variant]} ${className}`}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
