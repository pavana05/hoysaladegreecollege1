import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

const VAPID_PUBLIC_KEY = 'BBjtsezwDm3wYn48U8fqz1ts4hAb-HH6A46aVjxduETo9FZ6h_dPBJGU1NhC7hzBOgj2nSl1b3tiRY08PWwcLKU';
const IS_NATIVE = Capacitor.isNativePlatform();

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check localStorage for persisted subscription state immediately
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const persisted = localStorage.getItem('hdc_push_subscribed');
      if (persisted === '1' && 'Notification' in window && Notification.permission === 'granted') {
        setIsSubscribed(true);
      }
    }
  }, []);

  useEffect(() => {
    // On native Capacitor (Android/iOS), web Push API + service workers in the
    // WebView can crash the app. Native push is handled by useNativePush().
    if (IS_NATIVE) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported in this browser');
      return;
    }

    // Check secure context
    if (!window.isSecureContext) {
      console.warn('Push notifications require HTTPS (secure context)');
      return;
    }

    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Service Worker registered successfully');
        setSwRegistration(reg);
        reg.pushManager.getSubscription().then((sub: PushSubscription | null) => {
          if (sub) {
            setIsSubscribed(true);
            localStorage.setItem('hdc_push_subscribed', '1');
            // Sync to DB if needed
            if (user) {
              supabase.from('push_subscriptions')
                .select('id')
                .eq('user_id', user.id)
                .eq('endpoint', sub.endpoint)
                .then(({ data }) => {
                  if (!data || data.length === 0) {
                    const subJson = sub.toJSON();
                    supabase.from('push_subscriptions').insert({
                      user_id: user.id,
                      endpoint: subJson.endpoint as string,
                      p256dh: subJson.keys?.p256dh || '',
                      auth: subJson.keys?.auth || '',
                    }).then(() => {
                      console.log('Push subscription saved to DB');
                    });
                  }
                });
            }
          } else if (Notification.permission === 'granted' && user) {
            // Permission granted but no subscription — re-subscribe silently
            reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            }).then((newSub) => {
              setIsSubscribed(true);
              localStorage.setItem('hdc_push_subscribed', '1');
              const subJson = newSub.toJSON();
              supabase.from('push_subscriptions').insert({
                user_id: user.id,
                endpoint: subJson.endpoint as string,
                p256dh: subJson.keys?.p256dh || '',
                auth: subJson.keys?.auth || '',
              }).then(() => console.log('Re-subscribed to push notifications'));
            }).catch((err) => {
              console.error('Auto re-subscribe failed:', err);
              setIsSubscribed(false);
              localStorage.removeItem('hdc_push_subscribed');
            });
          } else {
            setIsSubscribed(false);
            localStorage.removeItem('hdc_push_subscribed');
          }
        });
      })
      .catch((err: any) => {
        console.error('Service Worker registration failed:', err);
      });
  }, [user]);

  const subscribe = useCallback(async () => {
    if (!user || !swRegistration || !VAPID_PUBLIC_KEY) return;

    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        toast.error('Notification permission denied. Please enable it in browser settings.');
        setIsLoading(false);
        return;
      }

      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = subscription.toJSON();

      await supabase.from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', subJson.endpoint as string);

      const { error } = await supabase.from('push_subscriptions').insert({
        user_id: user.id,
        endpoint: subJson.endpoint as string,
        p256dh: subJson.keys?.p256dh || '',
        auth: subJson.keys?.auth || '',
      });

      if (error) throw error;

      setIsSubscribed(true);
      localStorage.setItem('hdc_push_subscribed', '1');
      toast.success('🔔 Push notifications enabled! You\'ll receive alerts even when the tab is closed.');
    } catch (err: any) {
      console.error('Push subscription failed:', err);
      toast.error('Failed to enable push notifications.');
    } finally {
      setIsLoading(false);
    }
  }, [user, swRegistration]);

  const unsubscribe = useCallback(async () => {
    if (!swRegistration || !user) return;

    try {
      const subscription = await swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await supabase.from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }
      setIsSubscribed(false);
      localStorage.removeItem('hdc_push_subscribed');
      toast.success('Push notifications disabled.');
    } catch (err) {
      console.error('Unsubscribe failed:', err);
    }
  }, [swRegistration, user]);

  return {
    permission,
    isSubscribed,
    isLoading,
    isSupported: 'serviceWorker' in navigator && 'PushManager' in window,
    subscribe,
    unsubscribe,
  };
}
