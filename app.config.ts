import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const appLinkHost = process.env.EXPO_PUBLIC_APP_LINK_HOST;
  // EAS cannot inject this into a dynamic app.config.ts. It is a public project identifier,
  // not a credential; keep the TD1 mobile binary linked to the Tekomi EAS project by default.
  const easOwner = process.env.EXPO_PUBLIC_EAS_OWNER || 'tekomi';
  const easProjectId = process.env.EXPO_PUBLIC_PROJECT_ID || '894d87f0-3956-43f2-86c4-d14684c0b492';
  // EAS File variables resolve to a temporary path on the remote builder. The public names
  // remain as a local-development fallback for teams already using them.
  const iosGoogleServicesFile =
    process.env.IOS_GOOGLE_SERVICES_FILE || process.env.EXPO_PUBLIC_IOS_GOOGLE_SERVICES_FILE;
  const androidGoogleServicesFile =
    process.env.ANDROID_GOOGLE_SERVICES_FILE ||
    process.env.EXPO_PUBLIC_ANDROID_GOOGLE_SERVICES_FILE;
  return {
    name: process.env.EXPO_PUBLIC_APP_NAME || 'Tekomi Chat',
    slug: process.env.EXPO_PUBLIC_APP_SLUG || 'tekomi-chat',
    version: '4.9.3',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'tekomi-chat',
    ios: {
      supportsTablet: true,
      bundleIdentifier: process.env.EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER || 'vn.tekomi.chat',
      infoPlist: {
        NSCameraUsageDescription:
          'This app requires access to the camera to upload images and videos.',
        NSPhotoLibraryUsageDescription:
          'This app requires access to the photo library to upload images.',
        NSMicrophoneUsageDescription:
          'This app requires access to the microphone for voice notes and secure calls.',
        NSAppleMusicUsageDescription:
          'This app does not use Apple Music, but a system API may require this permission.',
        UIBackgroundModes: ['fetch', 'remote-notification', 'audio'],
        ITSAppUsesNonExemptEncryption: false,
      },
      // Please use the relative path to the google-services.json file
      googleServicesFile: iosGoogleServicesFile,
      entitlements: { 'aps-environment': 'production' },
      // Only enable Universal Links after this host serves a valid apple-app-site-association file.
      associatedDomains: appLinkHost ? [`applinks:${appLinkHost}`] : [],
    },
    android: {
      adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#ffffff' },
      package: process.env.EXPO_PUBLIC_ANDROID_PACKAGE || 'vn.tekomi.chat',
      permissions: [
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.POST_NOTIFICATIONS',
      ],
      // Please use the relative path to the google-services.json file
      googleServicesFile: androidGoogleServicesFile,
      intentFilters: [
        ...(appLinkHost
          ? [
              {
                action: 'VIEW' as const,
                autoVerify: true,
                data: [
                  {
                    scheme: 'https',
                    host: appLinkHost,
                    pathPrefix: '/app/accounts/',
                    pathPattern: '/*/conversations/*',
                  },
                ],
                category: ['BROWSABLE', 'DEFAULT'],
              },
            ]
          : []),
        {
          action: 'VIEW',
          data: [
            {
              scheme: 'tekomi-chat',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    extra: {
      // These public values pin this mobile binary to the intended PBX. TURN credentials
      // and the shared secret deliberately stay server-side and are minted per user by
      // GET /inboxes/:id/phone_credentials.
      phoneNetwork: {
        wssUrl: 'wss://wss.td1.tekomi.vn',
        sipDomain: 'td1.tekomi.vn',
        stunUrls: ['stun:td1.tekomi.vn:3478'],
        turnUrls: ['turn:td1.tekomi.vn:3478?transport=udp'],
      },
      eas: {
        projectId: easProjectId,
        storybookEnabled: process.env.EXPO_STORYBOOK_ENABLED,
      },
    },
    owner: easOwner,
    plugins: [
      'expo-font',
      'expo-image',
      'expo-status-bar',
      [
        'expo-splash-screen',
        {
          image: './assets/splash.png',
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          enableFullScreenImage_legacy: true,
        },
      ],
      [
        'react-native-permissions',
        { iosPermissions: ['Camera', 'PhotoLibrary', 'MediaLibrary', 'Notifications'] },
      ],
      [
        '@sentry/react-native',
        {
          url: 'https://sentry.io/',
          project: process.env.EXPO_PUBLIC_SENTRY_PROJECT_NAME,
          organization: process.env.EXPO_PUBLIC_SENTRY_ORG_NAME,
        },
      ],
      'expo-web-browser',
      '@react-native-community/datetimepicker',
      '@react-native-firebase/app',
      '@react-native-firebase/messaging',
      [
        'expo-build-properties',
        {
          // compileSdk/targetSdk 36 = Expo SDK 54 / RN 0.81 default (Android 16).
          // notifee (issue #808) needs compileSdk >= 35, satisfied by 36.
          android: {
            minSdkVersion: 24,
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            enableProguardInReleaseBuilds: true,
          },
        },
      ],
      './with-ffmpeg-pod.js',
      './with-android-notification-channel.js',
      './with-notifee-maven-repo.js',
      './with-ios-modular-headers.js',
      '@config-plugins/react-native-webrtc',
    ],
    androidNavigationBar: { backgroundColor: '#ffffff' },
  };
};
