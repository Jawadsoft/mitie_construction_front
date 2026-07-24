import { toast } from 'sonner';

export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast.info(message),
  warning: (message: string) => toast.warning(message),
};

export function notifyError(err: unknown, fallback = 'Something went wrong') {
  const message = err instanceof Error ? err.message : fallback;
  notify.error(message);
  return message;
}
