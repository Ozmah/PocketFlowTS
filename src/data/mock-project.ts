// Mock data representing a realistic React TypeScript component library
// Based on common patterns found in UI libraries and React projects

import type { FetchedFile } from "../types/tutorial";

export const MOCK_PROJECT_NAME = "React UI Components Library";
export const MOCK_REPO_URL = "https://github.com/example/react-ui-lib";

export const MOCK_FILES: FetchedFile[] = [
	{
		path: "src/components/Button/Button.tsx",
		content: `import React from 'react';
import { cn } from '../../utils/cn';
import type { ButtonProps } from './Button.types';

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'default',
            'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'destructive',
            'border border-input bg-background hover:bg-accent': variant === 'outline',
            'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
          },
          {
            'h-10 px-4 py-2': size === 'default',
            'h-9 rounded-md px-3': size === 'sm',
            'h-11 rounded-md px-8': size === 'lg',
          },
          className
        )}
        ref={ref}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';`,
		size: 1024,
	},
	{
		path: "src/components/Button/Button.types.ts",
		content: `import { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

export type ButtonVariant = ButtonProps['variant'];
export type ButtonSize = ButtonProps['size'];`,
		size: 512,
	},
	{
		path: "src/hooks/useLocalStorage.ts",
		content: `import { useState, useEffect, useCallback } from 'react';

type SetValue<T> = T | ((val: T) => T);

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: SetValue<T>) => void, () => void] {
  // Get from local storage then parse stored json or return initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined') {
        return initialValue;
      }
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(\`Error reading localStorage key "\${key}":\`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback(
    (value: SetValue<T>) => {
      try {
        // Allow value to be a function so we have the same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(\`Error setting localStorage key "\${key}":\`, error);
      }
    },
    [key, storedValue]
  );

  // Remove the key from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(\`Error removing localStorage key "\${key}":\`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}`,
		size: 1536,
	},
	{
		path: "src/utils/cn.ts",
		content: `import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to conditionally join classNames together
 * Combines clsx for conditional classes and tailwind-merge for conflicting Tailwind classes
 * 
 * @param inputs - Class values to merge
 * @returns Merged className string
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Creates a variant class name based on props and base classes
 * Useful for component variants with Tailwind CSS
 */
export function createVariants<T extends Record<string, any>>(
  baseClasses: string,
  variants: Record<keyof T, Record<string, string>>,
  props: T
): string {
  const variantClasses = Object.entries(props)
    .map(([key, value]) => variants[key as keyof T]?.[value as string])
    .filter(Boolean)
    .join(' ');
  
  return cn(baseClasses, variantClasses);
}`,
		size: 768,
	},
	{
		path: "src/utils/formatters.ts",
		content: `/**
 * Utility functions for formatting data
 */

export const formatCurrency = (
  amount: number,
  currency = 'USD',
  locale = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatDate = (
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {},
  locale = 'en-US'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(dateObj);
};

export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\\w\\s-]/g, '')
    .replace(/[\\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const truncate = (text: string, length: number): string => {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + '...';
};`,
		size: 1200,
	},
	{
		path: "src/components/Button/Button.test.tsx",
		content: `import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary');
  });

  it('renders different variants correctly', () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');

    rerender(<Button variant="outline">Cancel</Button>);
    expect(screen.getByRole('button')).toHaveClass('border');

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass('hover:bg-accent');
  });

  it('handles different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-9');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-11');
  });

  it('handles disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Clickable</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('forwards ref correctly', () => {
    const ref = jest.fn();
    render(<Button ref={ref}>With Ref</Button>);
    expect(ref).toHaveBeenCalled();
  });
});`,
		size: 1400,
	},
	{
		path: "src/types/common.ts",
		content: `/**
 * Common type definitions used across the component library
 */

export type Size = 'sm' | 'md' | 'lg' | 'xl';
export type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'error';
export type Color = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';

export interface BaseComponentProps {
  className?: string;
  id?: string;
  'data-testid'?: string;
}

export interface WithChildren {
  children?: React.ReactNode;
}

export interface WithSize {
  size?: Size;
}

export interface WithVariant {
  variant?: Variant;
}

export interface ComponentConfig {
  baseClasses: string;
  variants: Record<string, Record<string, string>>;
  sizes: Record<string, string>;
  defaultProps: Record<string, any>;
}

export interface APIResponse<T = any> {
  data: T;
  message: string;
  success: boolean;
  timestamp: string;
}

export interface PaginatedResponse<T = any> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}`,
		size: 1024,
	},
	{
		path: "package.json",
		content: `{
  "name": "react-ui-components",
  "version": "1.0.0",
  "description": "A modern React UI component library with TypeScript",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts,.tsx",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "jest": "^29.0.0",
    "eslint": "^8.0.0"
  }
}`,
		size: 768,
	},
];
