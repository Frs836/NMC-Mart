import { getSupabaseClient } from './supabase';

export type NotificationType = 'SALE' | 'REFUND' | 'CASH_IN' | 'CASH_OUT' | 'OWNER_DRAW' | 'PO' | 'SYSTEM';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  payload: Record<string, any>;
  readAt?: string | null;
  createdAt: string;
}

export const formatIDR = (v: number | string): string => 'Rp ' + Number(v || 0).toLocaleString('id-ID');

const localListeners = new Set<(n: AppNotification) => void>();

export function emitLocalNotification(n: AppNotification): void {
  localListeners.forEach((fn) => {
    try { fn(n); } catch (e) { console.warn('notification listener error:', e); }
  });
}

export function onLocalNotification(fn: (n: AppNotification) => void): () => void {
  localListeners.add(fn);
  return () => { localListeners.delete(fn); };
}

/**
 * Simpan notifikasi ke Supabase + munculkan banner lokal sesegera mungkin.
 * Try/catch non-blocking: kegagalan notifikasi TIDAK boleh menghalangi transaksi.
 */
export async function createNotification(partial: {
  type: NotificationType;
  title: string;
  body?: string;
  payload?: Record<string, any>;
}): Promise<AppNotification | null> {
  const notification: AppNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: partial.type,
    title: partial.title,
    body: partial.body,
    payload: partial.payload || {},
    readAt: null,
    createdAt: new Date().toISOString()
  };

  emitLocalNotification(notification);

  const client = getSupabaseClient();
  if (!client) return notification;
  try {
    await client.from('notifications').insert({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body || null,
      payload: notification.payload,
      created_at: notification.createdAt
    });
  } catch (e) {
    console.warn('notification insert skipped:', e);
  }
  return notification;
}

export async function fetchNotifications(branchId?: string, limit = 50): Promise<AppNotification[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    let query = client.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit);
    if (branchId) {
      query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id,
      type: d.type,
      title: d.title,
      body: d.body || undefined,
      payload: d.payload || {},
      readAt: d.read_at || null,
      createdAt: d.created_at
    }));
  } catch (e) {
    return [];
  }
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !ids || ids.length === 0) return;
  try {
    await client.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids);
  } catch (e) {}
}

export async function markAllNotificationsRead(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  } catch (e) {}
}
