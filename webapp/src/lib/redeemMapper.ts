export const DASH = '—';

export const pick = (v: unknown): unknown =>
  v === undefined || v === null || v === '' ? DASH : v;

export type RedeemResult =
  | {
      kind: 'success';
      dealTitle: string | typeof DASH;
      amount: number | typeof DASH;
      id: string | typeof DASH;
      redeemedAt: string | typeof DASH;
    }
  | {
      kind: 'already_used';
      message: 'Already used';
      redeemedAt: string | typeof DASH;
    }
  | {
      kind: 'not_found';
      message: 'Code not found';
    }
  | {
      kind: 'error';
      message: string;
    };

export function mapRedeemResponse(status: number, body: unknown): RedeemResult {
  const b = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};

  if (status === 404) {
    return { kind: 'not_found', message: 'Code not found' };
  }

  if (status === 429) {
    return { kind: 'error', message: 'Too many attempts, please wait a minute' };
  }

  if (status === 409) {
    const orderObj = b.order && typeof b.order === 'object' ? (b.order as Record<string, unknown>) : null;
    const at = orderObj?.redeemedAt ?? b.redeemedAt;
    return {
      kind: 'already_used',
      message: 'Already used',
      redeemedAt: pick(at) as string | typeof DASH,
    };
  }

  if (status >= 200 && status < 300 && b.ok === true) {
    const o = b.order && typeof b.order === 'object' ? (b.order as Record<string, unknown>) : {};
    return {
      kind: 'success',
      dealTitle: pick(o.dealTitle) as string | typeof DASH,
      amount: pick(o.amount) as number | typeof DASH,
      id: pick(o.id) as string | typeof DASH,
      redeemedAt: pick(o.redeemedAt) as string | typeof DASH,
    };
  }

  return { kind: 'error', message: 'Something went wrong' };
}

export function formatRedeemedAt(value: unknown): string {
  if (value === undefined || value === null || value === '' || value === DASH) {
    return DASH;
  }
  const d = new Date(String(value));
  if (isNaN(d.getTime())) {
    return DASH;
  }
  return d.toLocaleString();
}
