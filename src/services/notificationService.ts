import { db } from '../firebase';
import { collection, setDoc, doc, getDocs, query, where, deleteDoc } from 'firebase/firestore';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const notificationService = {
  /**
   * Checks if service worker and push notifications are supported by the browser
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  },

  /**
   * Retrieves the public VAPID key from the backend API
   */
  async getPublicKey(): Promise<string> {
    const response = await fetch('/api/push/public-key');
    if (!response.ok) {
      throw new Error('Failed to retrieve push public key');
    }
    const data = await response.json();
    return data.publicKey;
  },

  /**
   * Subscribes the current user to push notifications
   */
  async subscribeUser(userId: string): Promise<PushSubscription> {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported in this browser.');
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permission for notifications was denied.');
    }

    // Register / Update Service Worker
    await navigator.serviceWorker.register('/sw.js');

    // Wait natively for service worker to be ready and active (safest and most robust on iOS Safari)
    const registration = await navigator.serviceWorker.ready;

    // Fetch VAPID public key
    const publicKey = await this.getPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // Subscribe to push manager stage
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    // Save subscription info to Firestore
    await this.saveSubscriptionToFirestore(userId, subscription);

    return subscription;
  },

  /**
   * Saves the subscription details into Firestore
   */
  async saveSubscriptionToFirestore(userId: string, subscription: PushSubscription): Promise<void> {
    // Generate a unique standard ID based on endpoint to avoid duplication (failsafe replace instead of btoa)
    const cleanedEndpoint = subscription.endpoint.replace(/[^a-zA-Z0-9]/g, '_');
    const subscriptionId = cleanedEndpoint.substring(Math.max(0, cleanedEndpoint.length - 80));
    
    // Safely extract subscription keys
    let rawSubscriptionJson: any = {
      endpoint: subscription.endpoint,
    };

    try {
      if (subscription && typeof subscription.toJSON === 'function') {
        rawSubscriptionJson = subscription.toJSON();
      } else {
        // Safe manual fallback extraction
        const p256dh = subscription.getKey ? subscription.getKey('p256dh') : null;
        const auth = subscription.getKey ? subscription.getKey('auth') : null;
        rawSubscriptionJson.keys = {
          p256dh: p256dh ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dh)))) : '',
          auth: auth ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(auth)))) : ''
        };
      }
    } catch (e) {
      console.warn('[PUSH SERVICE] JSON extraction fallback:', e);
      const p256dh = subscription.getKey ? subscription.getKey('p256dh') : null;
      const auth = subscription.getKey ? subscription.getKey('auth') : null;
      rawSubscriptionJson.keys = {
        p256dh: p256dh ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dh)))) : '',
        auth: auth ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(auth)))) : ''
      };
    }

    await setDoc(doc(db, 'push_subscriptions', subscriptionId), {
      id: subscriptionId,
      userId,
      subscription: rawSubscriptionJson,
      createdAt: new Date().toISOString()
    });
  },

  /**
   * Check if user is currently subscribed
   */
  async checkSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported()) return null;
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return null;
    return await registration.pushManager.getSubscription();
  },

  /**
   * Unsubscribe user from push notifications
   */
  async unsubscribeUser(userId: string): Promise<void> {
    if (!this.isSupported()) return;

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const cleanedEndpoint = subscription.endpoint.replace(/[^a-zA-Z0-9]/g, '_');
      const subscriptionId = cleanedEndpoint.substring(Math.max(0, cleanedEndpoint.length - 80));
      
      // Unsubscribe from browser push services
      await subscription.unsubscribe();

      // Delete subscription entry inside Firestore
      try {
        await deleteDoc(doc(db, 'push_subscriptions', subscriptionId));
      } catch (err) {
        console.error('Error removing push subscription from database:', err);
      }
    }
  },

  /**
   * Dispatches push notification to all subscriptions of a specific user
   */
  async sendToUser(userId: string, title: string, body: string, url: string = '/'): Promise<void> {
    try {
      // Query Firestore for subdocs matching userId
      const q = query(collection(db, 'push_subscriptions'), where('userId', '==', userId));
      const snap = await getDocs(q);
      const subs: any[] = [];
      snap.forEach((doc) => {
        subs.push(doc.data());
      });

      if (subs.length === 0) {
        console.log(`No active push subscriptions found for user: ${userId}`);
        return;
      }

      // Dispatch to subscriptions via API proxy
      const response = await fetch('/api/push/send-multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptions: subs,
          title,
          body,
          url
        })
      });

      if (!response.ok) {
        throw new Error('Failed to dispatch notifications to subscribers');
      }
    } catch (err) {
      console.error('Error sending push notification to user:', err);
    }
  },

  /**
   * Dispatches push notification to ALL registered subscribers globally
   */
  async broadcastNotification(title: string, body: string, url: string = '/'): Promise<void> {
    try {
      const snap = await getDocs(collection(db, 'push_subscriptions'));
      const subs: any[] = [];
      snap.forEach((doc) => {
        subs.push(doc.data());
      });

      if (subs.length === 0) return;

      await fetch('/api/push/send-multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptions: subs,
          title,
          body,
          url
        })
      });
    } catch (err) {
      console.error('Error broadcasting system notifications:', err);
    }
  }
};
