# WV811 Mobile Push Notifications - FCM Setup Guide

## Overview

This document provides step-by-step instructions for setting up Firebase Cloud Messaging (FCM) to enable native mobile push notifications for the 811 high-risk proximity alert system.

## What's Already Implemented

The codebase has complete support for:
- **Database**: `user_push_tokens` and `push_notification_logs` tables (migration 121)
- **Edge Functions**:
  - `send-push-notification` - FCM HTTP v1 API integration
  - `wv811-high-risk-alert` - Triggers push notifications on high-risk area entry
- **Helper Functions**: `get_user_push_tokens()`, `get_organization_push_tokens()`

## What You Need to Do

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** (or **"Add project"**)
3. Enter project name: `triton-construction` (or your preferred name)
4. Disable Google Analytics (optional, not needed for FCM)
5. Click **"Create project"**
6. Wait for project creation to complete

### Step 2: Enable Cloud Messaging

1. In your Firebase project, click the **gear icon** (Settings) > **Project settings**
2. Go to the **"Cloud Messaging"** tab
3. Note your **Sender ID** (you'll need this for the mobile app)
4. FCM is enabled by default for new projects

### Step 3: Create a Service Account

1. In Firebase Console, go to **Project settings** > **Service accounts**
2. Click **"Generate new private key"**
3. Click **"Generate key"** to download the JSON file
4. **IMPORTANT**: Keep this file secure - it contains sensitive credentials

The downloaded JSON file looks like this:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com",
  "client_id": "123456789...",
  ...
}
```

### Step 4: Configure Supabase Environment Variables

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/gablgsruyuhvjurhtcxx)
2. Navigate to **Settings** > **Edge Functions**
3. Add the following secrets:

| Secret Name | Value | Source |
|-------------|-------|--------|
| `FCM_PROJECT_ID` | `your-project-id` | From JSON: `project_id` |
| `FCM_CLIENT_EMAIL` | `firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com` | From JSON: `client_email` |
| `FCM_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n` | From JSON: `private_key` |

**Important Notes:**
- The `FCM_PRIVATE_KEY` must include the full key with `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Keep the `\n` characters as literal strings - the code handles conversion

### Step 5: Deploy Edge Functions

Deploy the push notification functions to Supabase:

```bash
# From the project root directory
cd /Users/brianlewis/triton-ai-platform

# Deploy the send-push-notification function
npx supabase functions deploy send-push-notification --no-verify-jwt

# Deploy the updated wv811-high-risk-alert function
npx supabase functions deploy wv811-high-risk-alert --no-verify-jwt
```

### Step 6: Run the Database Migration

If not already run, execute migration 121 to create the push token tables:

```bash
# Via Supabase CLI
npx supabase db push

# Or manually in SQL Editor
# Paste contents of supabase/migrations/121_user_push_tokens.sql
```

### Step 7: Configure iOS App (Required for iOS Push)

#### 7a. Generate APNs Key

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
2. Click **"+"** to create a new key
3. Name: `Triton FCM APNs Key`
4. Check **"Apple Push Notifications service (APNs)"**
5. Click **"Continue"** then **"Register"**
6. Download the `.p8` file and note the **Key ID**

#### 7b. Upload APNs Key to Firebase

1. In Firebase Console, go to **Project settings** > **Cloud Messaging**
2. Under **"Apple app configuration"**, click **"Upload"** in the APNs Authentication Key section
3. Upload your `.p8` file
4. Enter the **Key ID** from Apple Developer Portal
5. Enter your **Team ID** (found in Apple Developer Portal membership)

#### 7c. Add Firebase to iOS App

1. In Firebase Console, click **"Add app"** > **iOS**
2. Enter your bundle ID: `com.triton.construction` (or your actual bundle ID)
3. Download `GoogleService-Info.plist`
4. Add it to your Xcode project (or Expo app)

### Step 8: Configure Android App

1. In Firebase Console, click **"Add app"** > **Android**
2. Enter package name: `com.triton.construction` (or your actual package name)
3. Download `google-services.json`
4. Add it to your Android project:
   - For Expo: Place in project root
   - For React Native: Place in `android/app/`

### Step 9: Mobile App Integration

#### For Expo/React Native (Recommended)

Install required packages:
```bash
npx expo install expo-notifications expo-device expo-constants
```

Add to `app.json` or `app.config.js`:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "sounds": ["./assets/notification-sound.wav"],
          "androidMode": "default",
          "androidCollapsedTitle": "Triton Construction"
        }
      ]
    ],
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

Create a push notification hook (`hooks/usePushNotifications.ts`):

```typescript
import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;

    // High-risk alerts should always show
    if (data?.type === 'high_risk_proximity') {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    }

    return {
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    };
  },
});

export function usePushNotifications() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    registerForPushNotifications();

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
        console.log('Notification received:', notification);
      }
    );

    // Listen for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        handleNotificationTap(data);
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  async function registerForPushNotifications() {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return;
    }

    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return;
    }

    // Get the FCM token
    const token = await Notifications.getDevicePushTokenAsync();
    setFcmToken(token.data);
    console.log('FCM Token:', token.data);

    // Save token to database
    await saveTokenToDatabase(token.data);

    // Configure Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('high_risk_alerts', {
        name: 'High-Risk Area Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF0000',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
      });

      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
  }

  async function saveTokenToDatabase(token: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('User not authenticated, cannot save push token');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      const { error } = await supabase.from('user_push_tokens').upsert(
        {
          user_id: user.id,
          organization_id: profile?.organization_id,
          push_token: token,
          platform: Platform.OS,
          provider: 'fcm',
          device_name: Device.deviceName || 'Unknown',
          device_model: Device.modelName || 'Unknown',
          os_version: Device.osVersion || 'Unknown',
          is_active: true,
          last_used_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,push_token',
        }
      );

      if (error) {
        console.error('Failed to save push token:', error.message);
      } else {
        console.log('Push token saved successfully');
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  function handleNotificationTap(data: Record<string, unknown>) {
    if (data?.type === 'high_risk_proximity') {
      // Navigate to ticket detail or map view
      const ticketId = data.nearest_ticket_id as string;
      if (ticketId) {
        // Use your navigation here
        // navigation.navigate('TicketDetail', { ticketId });
        console.log('Navigate to ticket:', ticketId);
      }
    }
  }

  return { fcmToken, notification };
}
```

### Step 10: Testing Push Notifications

#### Test via Firebase Console

1. Go to Firebase Console > **Engage** > **Messaging**
2. Click **"Create your first campaign"** > **"Firebase Notification messages"**
3. Enter test title and body
4. Click **"Send test message"**
5. Enter an FCM token from your database
6. Click **"Test"**

#### Test via API

```bash
# Get an FCM token from the database
API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhYmxnc3J1eXVodmp1cmh0Y3h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk0Njc5NSwiZXhwIjoyMDgwNTIyNzk1fQ.3gmXsKaWtBuQTSR2Rt_2A-oVqrjvIjQ3-LQFr7ONniA"

# Test the send-push-notification function
curl -X POST "https://gablgsruyuhvjurhtcxx.supabase.co/functions/v1/send-push-notification" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tokens": ["YOUR_FCM_TOKEN_HERE"],
    "title": "Test Notification",
    "body": "This is a test push notification",
    "notification_type": "general_alert"
  }'
```

#### Test High-Risk Alert

```bash
# Trigger a high-risk area check
curl -X POST "https://gablgsruyuhvjurhtcxx.supabase.co/functions/v1/wv811-high-risk-alert" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 38.3498,
    "longitude": -81.6326,
    "radius_meters": 500,
    "user_id": "YOUR_USER_ID",
    "organization_id": "YOUR_ORG_ID"
  }'
```

## Troubleshooting

### "FCM not configured" Error

Ensure all three environment variables are set in Supabase:
- `FCM_PROJECT_ID`
- `FCM_CLIENT_EMAIL`
- `FCM_PRIVATE_KEY`

### Notifications Not Received on iOS

1. Ensure APNs key is uploaded to Firebase
2. Check that the app has notification permissions
3. Verify the bundle ID matches Firebase configuration
4. Test on a physical device (simulators don't receive push)

### Notifications Not Received on Android

1. Ensure `google-services.json` is in the correct location
2. Check that the notification channel exists (`high_risk_alerts`)
3. Verify the package name matches Firebase configuration
4. Check that the app isn't in "Do Not Disturb" mode

### Token Shows as "Invalid"

- Tokens expire if the app is uninstalled/reinstalled
- The system automatically deactivates invalid tokens
- Users need to re-register by opening the app

### Permission Denied

- iOS: Check Settings > Notifications > [Your App]
- Android: Check Settings > Apps > [Your App] > Notifications

## Database Schema Reference

### user_push_tokens

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| organization_id | UUID | Foreign key to organizations |
| push_token | TEXT | FCM device token |
| platform | TEXT | 'ios', 'android', or 'web' |
| provider | TEXT | 'fcm' or 'apns' |
| device_name | TEXT | Device name |
| is_active | BOOLEAN | Whether token is valid |
| high_risk_alerts_enabled | BOOLEAN | User preference |
| quiet_hours_start | TIME | Do not disturb start |
| quiet_hours_end | TIME | Do not disturb end |

### push_notification_logs

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Target user |
| title | TEXT | Notification title |
| body | TEXT | Notification body |
| notification_type | TEXT | Type of notification |
| status | TEXT | 'pending', 'sent', 'delivered', 'failed' |
| fcm_message_id | TEXT | FCM message ID |
| error_message | TEXT | Error details if failed |

## Security Notes

1. **Never expose Firebase credentials** in client-side code
2. **Service account key** should only be in Supabase environment variables
3. **Push tokens** are user-specific and should be protected by RLS
4. **Rate limiting** is recommended for production (implemented in code)
5. **Token refresh** - tokens can expire; the app should re-register on launch

## Related Files

- [supabase/migrations/121_user_push_tokens.sql](../supabase/migrations/121_user_push_tokens.sql) - Database schema
- [supabase/functions/send-push-notification/index.ts](../supabase/functions/send-push-notification/index.ts) - FCM sender
- [supabase/functions/wv811-high-risk-alert/index.ts](../supabase/functions/wv811-high-risk-alert/index.ts) - Alert trigger
