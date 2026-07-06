
import type { FormHTMLAttributes, ReactNode } from 'react';
export function Form({ children, className = '', ...props }: FormHTMLAttributes<HTMLFormElement> & { children: ReactNode }) { return <form className={`formPrimitive ${className}`} {...props}>{children}</form>; }
