// Modal-related types

export interface ModalState {
  isOpen: boolean;
  data?: any;
}

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface ConfirmDialogProps extends DialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}