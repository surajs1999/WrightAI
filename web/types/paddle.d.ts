declare global {
  interface Window {
    Paddle?: {
      Initialize: (opts: { token: string; eventCallback?: (ev: { name: string }) => void }) => void;
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
