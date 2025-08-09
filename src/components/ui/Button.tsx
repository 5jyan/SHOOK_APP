import React from 'react';
import { Pressable, Text, ActivityIndicator, PressableProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "flex-row items-center justify-center rounded-lg font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary",
        destructive: "bg-destructive",
        outline: "border border-border bg-transparent",
        secondary: "bg-secondary",
        ghost: "bg-transparent",
      },
      size: {
        default: "px-4 py-3",
        sm: "px-3 py-2",
        lg: "px-6 py-4",
        icon: "p-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const textVariants = cva(
  "font-medium text-center",
  {
    variants: {
      variant: {
        default: "text-primary-foreground",
        destructive: "text-destructive-foreground",
        outline: "text-foreground",
        secondary: "text-secondary-foreground",
        ghost: "text-foreground",
      },
      size: {
        default: "text-base",
        sm: "text-sm",
        lg: "text-lg",
        icon: "text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends PressableProps,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
}

export function Button({
  children,
  variant,
  size,
  loading = false,
  disabled = false,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      className={cn(
        buttonVariants({ variant, size }),
        isDisabled && "opacity-50",
        className
      )}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? '#000' : '#fff'}
          style={{ marginRight: 8 }}
        />
      )}
      {typeof children === 'string' ? (
        <Text className={textVariants({ variant, size })}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}