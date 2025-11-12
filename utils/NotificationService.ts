import { Platform } from 'react-native';

// Platform-aware notification service
// expo-notifications is not fully supported on web, so we handle it conditionally
let notificationHandlerInitialized = false;

// Lazy load expo-notifications only when needed (not on web)
const getNotifications = () => {
  if (Platform.OS === 'web') {
    return null;
  }
  
  try {
    // Lazy require - only loads when actually called on native platforms
    return require('expo-notifications');
  } catch (error) {
    // expo-notifications might not be available
    return null;
  }
};

// Initialize notification handler safely
// Note: expo-notifications has limitations in Expo Go, use a development build for full functionality
const initializeNotificationHandler = (Notifications: any) => {
  if (notificationHandlerInitialized || !Notifications || Platform.OS === 'web') return;
  
  try {
    // Handle foreground notifications
    // This will work in development builds but may have limitations in Expo Go
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationHandlerInitialized = true;
  } catch (error) {
    // Silently handle errors - notifications may not be available in Expo Go
    // This is expected behavior in Expo Go
  }
};

// Web fallback: Use browser Notification API
const sendWebNotification = async (title: string, body: string) => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Browser notifications not supported');
    return;
  }

  try {
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if (Notification.permission === 'granted') {
      // Create notification without icon to avoid 404 errors
      // Browser will use default icon if available
      const notificationOptions: NotificationOptions = {
        body,
        // icon is optional - browser will use default if not provided
        // If you want to use an icon, ensure it's served from a valid public path
      };
      
      new Notification(title, notificationOptions);
    } else {
      console.warn('Notification permission denied');
    }
  } catch (error) {
    console.warn('Failed to send web notification:', error);
  }
};

// Send immediately
export const sendLocalNotification = async (title: string, body: string) => {
  // Handle web platform
  if (Platform.OS === 'web') {
    await sendWebNotification(title, body);
    return;
  }

  // Lazy load notifications only on native platforms
  const Notifications = getNotifications();
  if (!Notifications) {
    console.warn('Notifications not available on this platform');
    return;
  }

  try {
    // Initialize handler on first use (lazy initialization)
    initializeNotificationHandler(Notifications);
    
    // Request permissions first
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Notification permissions not granted');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch (error) {
    console.warn('Failed to send local notification. Note: Notifications may not work in Expo Go. Use a development build for full functionality.');
    // In Expo Go, this will fail but won't crash the app
  }
};

// Schedule for later
export const scheduleNotification = async (title: string, body: string, seconds: number) => {
  // Web platform: Use setTimeout as fallback
  if (Platform.OS === 'web') {
    setTimeout(() => {
      sendWebNotification(title, body);
    }, seconds * 1000);
    return;
  }

  // Lazy load notifications only on native platforms
  const Notifications = getNotifications();
  if (!Notifications) {
    console.warn('Notifications not available on this platform');
    return;
  }

  try {
    // Initialize handler on first use (lazy initialization)
    initializeNotificationHandler(Notifications);
    
    // Request permissions first
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Notification permissions not granted');
      return;
    }

    const trigger: any = {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
    };

    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger,
    });
  } catch (error) {
    console.warn('Failed to schedule notification. Note: Notifications may not work in Expo Go. Use a development build for full functionality.');
    // In Expo Go, this will fail but won't crash the app
  }
};

