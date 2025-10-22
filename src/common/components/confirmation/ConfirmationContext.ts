import type { ReactNode } from "react";
import { createContext } from "react";

export interface ConfirmationOptions {
  title: string;
  content: ReactNode;
  cancelButton?: ReactNode | string;
  confirmButton?: ReactNode | string;
  confirmButtonColor?: string;
  confirmButtonVariant?: string;
}

export interface ConfirmationContextType {
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
}

export const ConfirmationContext =
  createContext<ConfirmationContextType | null>(null);
