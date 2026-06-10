type PaddleEventName =
  | "checkout.completed"
  | "checkout.customer.created"
  | "checkout.error"
  | "checkout.warning"
  | "checkout.loaded"
  | "checkout.closed"
  | "checkout.payment.initiated"
  | "checkout.payment.failed"
  | (string & {});

interface PaddleEvent {
  name: PaddleEventName;
  data?: Record<string, unknown>;
  error?: { code?: string; detail?: string; message?: string } | string;
}

declare global {
  interface Window {
    Paddle?: {
      Environment: {
        set: (env: "production" | "sandbox") => void;
      };
      Initialize: (opts: { token: string; eventCallback?: (ev: PaddleEvent) => void }) => void;
      Checkout: {
        open: (opts: {
          transactionId?: string;
          items?: { priceId: string; quantity: number }[];
          customer?: { email: string };
          customData?: Record<string, string>;
          settings?: Record<string, unknown>;
        }) => void;
      };
    };
  }
}

export {};
