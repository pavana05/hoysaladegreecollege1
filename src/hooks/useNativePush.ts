import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

/**
 * Handles native Capacitor push notifications on Android/iOS.
 * Registers for push, saves FCM token to DB, and handles foreground notifications.
 *
 * IMPORTANT: All listener registrations happen BEFORE PushNotifications.register()
 * to avoid race conditions where the `registration` event fires before listeners
 * are attached. We also wrap each native call in its own try/catch so a single
 * failure (e.g. missing google-services.json, denied LocalNotifications
 * permission) cannot bubble up and crash the WebView.
 */
export function useNativePush() {
  const { user } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform() || registered.current) return;
    registered.current = true;

    let cleanup: (() => void) | undefined;

    const init = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Lazy-load LocalNotifications; it's optional for foreground display.
        let LocalNotifications: any = null;
        try {
          const mod = await import('@capacitor/local-notifications');
          LocalNotifications = mod.LocalNotifications;
          try {
            await LocalNotifications.requestPermissions();
          } catch (e) {
            console.warn('LocalNotifications permission request failed:', e);
          }
        } catch (e) {
          console.warn('LocalNotifications plugin unavailable:', e);
        }

        // === Attach listeners FIRST ===
        const tokenListener = await PushNotifications.addListener('registration', async (token) => {
          console.log('Native push token received');
          try {
            const { data: existing } = await supabase
              .from('fcm_tokens' as any)
              .select('id')
              .eq('user_id', user.id)
              .eq('token', token.value)
              .maybeSingle();

            if (!existing) {
              await supabase.from('fcm_tokens' as any).insert({
                user_id: user.id,
                token: token.value,
                device_info: `capacitor-${Capacitor.getPlatform()}`,
              });
            }
          } catch (err) {
            console.error('Failed to save native FCM token:', err);
          }
        });

        const errorListener = await PushNotifications.addListener('registrationError', (err) => {
          console.error('Push registration error:', err);
        });

        const foregroundListener = await PushNotifications.addListener(
          'pushNotificationReceived',
          async (notification) => {
            console.log('Foreground push received');

            // Focus-mode filter: silence non-urgent notifications while a
            // focus session is running. Emergency/urgent pushes always pass.
            try {
              const { isFocusActive, isUrgent, notifyBlocked } = await import('@/lib/focus-mode');
              const urgency = (notification.data as any)?.urgency;
              if (isFocusActive() && !isUrgent(urgency)) {
                notifyBlocked({ title: notification.title, body: notification.body });
                return;
              }
            } catch { /* fall through to display */ }

            if (!LocalNotifications) return;
            try {
              // No `schedule.at` — fires immediately and avoids needing
              // SCHEDULE_EXACT_ALARM on Android 13+ which crashes without it.
              await LocalNotifications.schedule({
                notifications: [{
                  title: notification.title || 'HDC Portal',
                  body: notification.body || 'New notification',
                  id: Math.floor(Date.now() % 2147483647),
                  sound: 'default',
                  extra: notification.data,
                }],
              });
            } catch (e) {
              console.error('Local notification error:', e);
            }
          }
        );

        const tapListener = await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          async (action) => {
            try {
              const { resolveTapUrl } = await import('@/lib/push-tap');
              const target = resolveTapUrl(action.notification.data as any);
              if (target) window.location.href = target;
            } catch (e) {
              console.error('Tap handler error:', e);
            }
          }
        );

        cleanup = () => {
          try { tokenListener.remove(); } catch {}
          try { errorListener.remove(); } catch {}
          try { foregroundListener.remove(); } catch {}
          try { tapListener.remove(); } catch {}
        };

        // === Then request permission ===
        let permResult;
        try {
          permResult = await PushNotifications.requestPermissions();
        } catch (e) {
          console.error('Push permission request failed:', e);
          return;
        }

        if (permResult.receive !== 'granted') {
          console.warn('Push notification permission denied');
          return;
        }

        // === Finally, register with FCM/APNs ===
        try {
          await PushNotifications.register();
        } catch (e) {
          // Most common cause: google-services.json missing or Firebase not
          // initialized in the native Android project. Don't let this crash.
          console.error('PushNotifications.register() failed:', e);
        }
      } catch (err) {
        console.error('Native push init error:', err);
      }
    };

    init();

    return () => {
      cleanup?.();
    };
  }, [user]);
}
