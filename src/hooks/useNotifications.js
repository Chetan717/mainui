import { useEffect, useRef, useState, useCallback } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app, db } from '../Firebase';
import { COLLECTIONS } from '../collections';
import { getUser } from '../utils/authStorage';

const VAPID_KEY = import.meta.env.VITE_VAPID_KEY;
const SW_PATH = '/firebase-messaging-sw.js';
const TOKEN_STORE_KEY = 'fcm_token_saved';

function getMobileNo() {
  try {
    const u = getUser() || {};
    return u.mobileNo || u.mobile || null;
  } catch { return null; }
}

function getFirebaseConfig() {
  return {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };
}

async function registerSW(onControllerChange) {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
    await reg.update();
    const active = reg.active || reg.installing || reg.waiting;
    if (active) {
      active.postMessage({ type: 'FIREBASE_CONFIG', config: getFirebaseConfig() });
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return reg;
  } catch (err) {
    // console.warn('[FCM] SW registration failed:', err);
    return null;
  }
}

async function saveFcmToken(token) {
  const mobileNo = getMobileNo();
  if (!mobileNo || !token) return;
  const prev = localStorage.getItem(TOKEN_STORE_KEY);
  if (prev === token) return;
  try {
    await setDoc(
      doc(db, 'fcmTokens', mobileNo),
      { token, mobileNo, platform: 'web', updatedAt: serverTimestamp() },
      { merge: true }
    );
    localStorage.setItem(TOKEN_STORE_KEY, token);
  } catch (err) {
    // console.warn('[FCM] Token save failed:', err);
  }
}

export function useNotifications() {
  const [permission, setPermission]     = useState(() => Notification?.permission ?? 'default');
  const [newCount, setNewCount]         = useState(0);
  const [latestTemplate, setLatest]     = useState(null);
  const [showToast, setShowToast]       = useState(false);
  const isInitialRef                    = useRef(true);
  const unsubRef                        = useRef(null);
  const messagingRef                    = useRef(null);

  const clearNew = useCallback(() => {
    setNewCount(0);
    setShowToast(false);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'denied';
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubControllerChange = null;

    const handleControllerChange = () => {
      navigator.serviceWorker.controller?.postMessage({
        type: 'FIREBASE_CONFIG', config: getFirebaseConfig(),
      });
    };

    async function init() {
      if (!('Notification' in window)) return;

      const swReg = await registerSW(handleControllerChange);
      if (cancelled) {
        if (swReg && 'serviceWorker' in navigator) {
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        }
        return;
      }
      if (swReg) {
        unsubControllerChange = () =>
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }

      if (Notification.permission === 'granted' && swReg && VAPID_KEY) {
        try {
          const msg = getMessaging(app);
          messagingRef.current = msg;
          const token = await getToken(msg, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: swReg,
          });
          if (token && !cancelled) await saveFcmToken(token);

          onMessage(msg, (payload) => {
            if (cancelled) return;
            const { title, body } = payload.notification || {};
            setLatest({ title, body, isFCM: true });
            setNewCount((c) => c + 1);
            setShowToast(true);
          });
        } catch (err) {
          // console.warn('[FCM] getToken failed:', err);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      unsubControllerChange?.();
    };
  }, []);

  useEffect(() => {
    const col = COLLECTIONS.MLMTEMPLATE;
    if (!col) return;

    const q = query(
      collection(db, col),
      where('Active', '==', true),
      where('Launched', '==', true)
    );

    unsubRef.current = onSnapshot(q, (snapshot) => {
      if (isInitialRef.current) {
        isInitialRef.current = false;
        return;
      }
      const added = snapshot.docChanges().filter((c) => c.type === 'added');
      if (added.length === 0) return;

      const newest = added[0].doc.data();
      setLatest({
        title: 'New Template Published! 🎉',
        body: newest.SelectType
          ? `New ${newest.SelectType} template is now available`
          : 'A new template has been added',
        showcaseUrl: newest.Showcase_url || null,
        isFirestore: true,
      });
      setNewCount((c) => c + added.length);
      setShowToast(true);
    }, (err) => {
      // console.warn('[FCM] Template snapshot error:', err);
    });

    return () => { unsubRef.current?.(); };
  }, []);

  return { permission, newCount, latestTemplate, showToast, clearNew, requestPermission, setShowToast };
}
