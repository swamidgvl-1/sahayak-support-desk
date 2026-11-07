'use client';

import { useState, useTransition } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { savePushSubscription, updateProfile } from '@/app/actions';
import { toast } from '@/lib/toast';

export function ProfileForm({ name, email, phone, role }: { name: string; email: string; phone: string; role: string }) {
  const [n, setN] = useState(name);
  const [p, setP] = useState(phone);
  const [pending, start] = useTransition();
  return (
    <form className="card space-y-3 p-4" onSubmit={(e) => {
      e.preventDefault();
      start(async () => { const r = await updateProfile({ full_name: n, phone: p }); r.ok ? toast('Profile saved', 'success') : toast(r.error, 'error'); });
    }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="n">Name</label><input id="n" className="input" value={n} onChange={(e) => setN(e.target.value)} required /></div>
        <div><label className="label" htmlFor="m">Mobile</label><input id="m" className="input" value={p} onChange={(e) => setP(e.target.value)} inputMode="tel" placeholder="+91…" /></div>
        <div><label className="label" htmlFor="e">Email</label><input id="e" className="input" value={email} disabled /></div>
        <div><label className="label" htmlFor="r">Role</label><input id="r" className="input capitalize" value={role} disabled /></div>
      </div>
      <button className="btn btn-primary" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} Save changes</button>
    </form>
  );
}

function b64ToUint8(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function PushToggle({ vapidKey }: { vapidKey: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'on'>('idle');
  if (!vapidKey) return null;
  async function enable() {
    try {
      setState('busy');
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Push notifications are not supported on this browser. On iPhone, add the app to your Home Screen first.');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error('Notifications were blocked. You can allow them in your browser settings.');
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(vapidKey) });
      await savePushSubscription(sub.toJSON());
      setState('on'); toast('Push notifications enabled on this device', 'success');
    } catch (e: any) {
      setState('idle'); toast(e.message || 'Could not enable notifications.', 'error');
    }
  }
  return (
    <div className="card flex items-center justify-between gap-3 p-4">
      <div><div className="font-medium">Push notifications</div><div className="text-xs text-muted">Get ticket updates on this device, even when the app is closed.</div></div>
      <button className="btn btn-sm" onClick={enable} disabled={state !== 'idle'}><Bell className="h-4 w-4" /> {state === 'on' ? 'Enabled' : state === 'busy' ? 'Enabling…' : 'Enable'}</button>
    </div>
  );
}
