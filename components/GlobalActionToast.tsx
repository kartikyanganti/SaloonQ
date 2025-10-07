// GlobalActionToast.tsx
import React, { useCallback, useEffect, useState } from "react";
import ActionToast from "./ActionToast";

export interface ToastData {
  message: string;
  type?: "success" | "error" | "warning" | "info" | "default";
  duration?: number;
  onConfirm?: () => void;
}

let setToastState: ((toast: ToastData | null) => void) | null = null;

// Global function to show toast
export const showActionToast = (toast: ToastData) => {
  setToastState?.(toast);
};

const GlobalActionToast: React.FC = () => {
  const [toast, setToast] = useState<ToastData | null>(null);

  const handleClose = useCallback(() => {
    setToast(null);
  }, []);

  const handleConfirm = useCallback(() => {
    toast?.onConfirm?.();
    setToast(null);
  }, [toast]);

  useEffect(() => {
    setToastState = setToast;
    return () => {
      setToastState = null;
    };
  }, []);

  if (!toast) return null;

  return (
    <ActionToast
      message={toast.message}
      duration={toast.duration || 5000}
      onConfirm={handleConfirm}
      onClose={handleClose}
    />
  );
};

export default GlobalActionToast;
