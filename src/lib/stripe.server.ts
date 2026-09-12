import Stripe from 'stripe';

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export type StripeEnv = 'sandbox' | 'live';

const GATEWAY_STRIPE_BASE = 'https://connector-gateway.lovable.dev/stripe';

export function resolveStripeEnv(): StripeEnv {
  return process.env['STRIPE_LIVE_API_KEY'] ? 'live' : 'sandbox';
}

export function getConnectionApiKey(env: StripeEnv): string {
  return env === 'sandbox'
    ? getEnv('STRIPE_SANDBOX_API_KEY')
    : getEnv('STRIPE_LIVE_API_KEY');
}

// Routes api.stripe.com requests through the connector gateway.
export function createStripeClient(env: StripeEnv): Stripe {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv('LOVABLE_API_KEY');

  return new Stripe(connectionApiKey, {
    apiVersion: '2026-03-25.dahlia',
    httpClient: Stripe.createFetchHttpClient((input, init) => {
      const stripeUrl = input instanceof Request ? input.url : input.toString();
      const gatewayUrl = stripeUrl.replace('https://api.stripe.com', GATEWAY_STRIPE_BASE);
      return fetch(gatewayUrl, {
        ...init,
        headers: {
          ...Object.fromEntries(
            new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)).entries(),
          ),
          'X-Connection-Api-Key': connectionApiKey,
          'Lovable-API-Key': lovableApiKey,
        },
      });
    }),
  });
}

export function getStripeErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const stripeError = error as {
      message?: string;
      type?: string;
      code?: string;
      decline_code?: string;
      param?: string;
      requestId?: string;
      raw?: {
        message?: string;
        type?: string;
        code?: string;
        decline_code?: string;
        param?: string;
        requestId?: string;
      };
    };

    const message = stripeError.raw?.message ?? stripeError.message;
    if (message) {
      const details = [
        stripeError.raw?.type ?? stripeError.type,
        stripeError.raw?.code ?? stripeError.code,
        stripeError.raw?.decline_code ?? stripeError.decline_code,
        stripeError.raw?.param ?? stripeError.param,
        stripeError.raw?.requestId ?? stripeError.requestId,
      ].filter(Boolean);
      return details.length ? `${message} (${details.join(', ')})` : message;
    }
  }

  return 'Stripe request failed';
}

const GATEWAY_V2_BASE = 'https://connector-gateway.lovable.dev/stripe';
const STRIPE_API_VERSION = '2026-03-25.dahlia';

/**
 * Calls Stripe's v2 API (Connect accounts v2) through the connector gateway.
 * Stripe no longer accepts v1 connected-account creation for new integrations.
 */
export async function stripeV2Request<T>(
  env: StripeEnv,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<T> {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv('LOVABLE_API_KEY');

  const response = await fetch(`${GATEWAY_V2_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Version': STRIPE_API_VERSION,
      'X-Connection-Api-Key': connectionApiKey,
      'Lovable-API-Key': lovableApiKey,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  if (!response.ok) {
    console.error(`Stripe v2 request failed [${response.status}] ${path}: ${text}`);
    let message = text;
    try {
      message = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? text;
    } catch {
      /* keep raw text */
    }
    throw new Error(message);
  }
  return JSON.parse(text) as T;
}

/**
 * Test mode everywhere except the real production hosts, so bank setup and
 * cash outs can be exercised safely from previews and local builds.
 */
export function resolveStripeEnvForHost(host: string | null | undefined): StripeEnv {
  const value = (host ?? '').toLowerCase();
  const isProductionHost =
    value === 'onlookerlive.com' ||
    value === 'www.onlookerlive.com' ||
    value === 'onlookers-live-map.lovable.app';
  if (!isProductionHost) return 'sandbox';
  return process.env['STRIPE_LIVE_API_KEY'] ? 'live' : 'sandbox';
}
