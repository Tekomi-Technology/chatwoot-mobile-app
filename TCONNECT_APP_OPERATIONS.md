# T-Connect mobile app: development, build and release guide

This document is the handover for the custom React Native/Expo mobile app based on Chatwoot Mobile.
It describes the current project, the release pipeline, required accounts/files, test procedures, and
the known failures encountered while building and testing the app.

> Security: never commit passwords, Apple private keys (.p8), signing certificates (.p12), Firebase
> service-account JSON, TURN shared secrets, or Chatwoot access tokens. The examples below use placeholders.

## 1. Current project

| Item | Current value |
|---|---|
| Repository | /Users/trung/Documents/he-sinh-thai/chatwoot-mobile-app |
| Framework | React Native + Expo, SDK 57 |
| Package manager | pnpm 11.9.0 (declared in package.json) |
| App display name | T-Connect |
| Expo slug | tekomi-chat |
| iOS bundle identifier | vn.tekomi.chat |
| Android application ID | vn.tekomi.chat |
| App version | 4.9.3 |
| EAS owner | tekomi |
| EAS project | @tekomi/tekomi-chat |
| EAS project ID | 894d87f0-3956-43f2-86c4-d14684c0b492 |
| App Store Connect app ID | 6811854991 |
| Chatwoot deployment | self-hosted; set the actual URL in .env |
| PBX/SIP server | td1.tekomi.vn (separate from the Chatwoot domain) |

The latest confirmed iOS release in the previous handover was build 21 of version 4.9.3. It was
successfully uploaded to App Store Connect and was waiting for Apple's processing. Always verify the
current status in App Store Connect before assuming that build is available to testers.

## 2. What is in the app

The app started from the official Chatwoot mobile app and keeps its existing navigation, authentication,
conversation and message UI. Custom areas are implemented alongside the upstream code:

- omnichannel conversation list, conversation details, replies, private notes, assignment, labels,
  status, canned responses and search;
- custom Zalo inbox/store and Zalo-specific data handling;
- phone tab with SIP/WebRTC softphone, inbound/outbound calls, keypad and call state;
- conversation analysis and related store/screens;
- VIP/priority conversation handling and dashboard data;
- push notification registration and notification handling;
- custom branding (T-Connect, logo-T.png);
- optional Sentry integration (currently safe to leave unconfigured).

Important source areas:

~~~text
src/features/phone/                 SIP/WebRTC phone feature
src/store/phone/                    phone state and credentials
src/store/zalo/                     Zalo state/integration
src/store/conversation-analysis/    conversation analysis state
src/store/notification/             push notification state
src/screens/phone/                  phone UI
src/screens/conversations/          conversation UI
src/navigation/                     tabs and stacks
src/assets/images/logo-T.png        app logo
app.config.ts                       Expo native configuration
eas.json                            EAS build/submit profiles
.env                                local environment (do not commit secrets)
~~~

## 3. Local setup

### 3.1 Prerequisites

Install or have access to:

- Node.js version compatible with the repository and Expo SDK;
- pnpm 11.9.0 (or a newer pnpm only after checking the lockfile);
- Xcode and an Apple Developer account for iOS local builds;
- Android Studio/SDK for Android local builds;
- Expo/EAS CLI available through the project dependencies;
- an Expo account with access to the tekomi owner;
- App Store Connect access for iOS submission;
- Google Play Console and a Play service account for Android submission.

The project contains a local EAS binary. If pnpm exec eas says that eas cannot be found, use:

~~~bash
cd /Users/trung/Documents/he-sinh-thai/chatwoot-mobile-app
pnpm install --frozen-lockfile
./node_modules/.bin/eas --version
~~~

If Corepack/pnpm itself is broken on a new machine, repair the package manager first rather than
editing the lockfile manually. The command paths in this document use ./node_modules/.bin/eas so they
do not depend on a global EAS installation.

### 3.2 Environment file

Copy the template and fill in values locally:

~~~bash
cp .env.example .env
~~~

Required/important keys:

~~~dotenv
EXPO_PUBLIC_APP_NAME=T-Connect
EXPO_PUBLIC_APP_SLUG=tekomi-chat
EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER=vn.tekomi.chat
EXPO_PUBLIC_ANDROID_PACKAGE=vn.tekomi.chat

EXPO_PUBLIC_CHATWOOT_BASE_URL=https://<your-chatwoot-host>
EXPO_PUBLIC_CHATWOOT_WEBSITE_TOKEN=<website-token-if-used>
EXPO_PUBLIC_MINIMUM_CHATWOOT_VERSION=4.1.0

EXPO_PUBLIC_EAS_OWNER=tekomi
EXPO_PUBLIC_PROJECT_ID=894d87f0-3956-43f2-86c4-d14684c0b492

IOS_GOOGLE_SERVICES_FILE=./GoogleService-Info.plist
ANDROID_GOOGLE_SERVICES_FILE=./google-services.json
~~~

The checked-in app.config.ts also contains safe defaults for the public app name, bundle IDs and EAS
project ID. The .env value wins when present. Keep .env and Firebase files out of Git unless the
repository's secret policy explicitly permits encrypted storage.

Check the resolved Expo configuration before building:

~~~bash
./node_modules/.bin/expo config --json | node -e \
  'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const x=JSON.parse(s); console.log({name:x.name,version:x.version,ios:x.ios?.bundleIdentifier,android:x.android?.package,owner:x.owner,projectId:x.extra?.eas?.projectId})})'
~~~

The result must show name T-Connect, iOS vn.tekomi.chat, Android vn.tekomi.chat and the expected
EAS project ID.

### 3.3 Firebase files and push notifications

Create/register two Firebase apps in the Firebase project:

1. iOS app with bundle ID vn.tekomi.chat.
2. Android app with package name vn.tekomi.chat.

Download the corresponding files from Firebase Console:

- iOS: GoogleService-Info.plist (configuration file, not an app to install on the phone).
- Android: google-services.json.

For iOS push, upload a valid APNs authentication key or APNs certificate to Firebase Cloud Messaging.
The key must belong to the Apple Team that owns vn.tekomi.chat, and the bundle ID/environment must
match. An FCM error containing Invalid APNs credential / THIRD_PARTY_AUTH_ERROR means this Apple
credential is wrong, expired, revoked, or registered under a different Team; it is not normally a
React Native UI problem.

For EAS, configure Firebase files as Secret File environment variables in the EAS project (production
environment), using the same names as the app config:

~~~text
IOS_GOOGLE_SERVICES_FILE
ANDROID_GOOGLE_SERVICES_FILE
~~~

Do not put the local absolute path to a private file in a public environment variable. Verify the EAS
environment before a production build.

## 4. Expo configuration and branding

app.config.ts controls the native identity and integrations:

- name is the installed app display name (T-Connect);
- slug is the Expo project slug and does not have to match the display name;
- ios.bundleIdentifier and android.package must remain stable after store publication;
- icon, splash screen and Android adaptive icon use src/assets/images/logo-T.png;
- extra.phoneNetwork contains public PBX endpoints;
- @react-native-firebase/messaging and notification plugins are enabled;
- microphone/audio/background modes are enabled for calls;
- Sentry plugin is present but can remain inactive when the DSN is empty.

Changing name changes the label shown below the installed icon. It does not automatically rename the
App Store Connect product record. The store listing name is managed separately in App Store Connect.

## 5. Phone/SIP configuration

The current public PBX endpoints are configured as:

~~~text
WebSocket: wss://wss.td1.tekomi.vn
SIP domain: td1.tekomi.vn
STUN: stun:td1.tekomi.vn:3478
TURN: turn:td1.tekomi.vn:3478?transport=udp
~~~

The TURN shared secret must stay on the server. The app receives short-lived per-user credentials from
the phone credentials endpoint (currently expected through the Chatwoot phone inbox flow), rather than
embedding the shared secret in the binary.

The error phone inbox is configured for an unexpected sip server means the selected Chatwoot phone
inbox advertises a different PBX/SIP server than the app's allowed phoneNetwork. Fix the inbox/PBX
configuration or the app configuration so they describe the same server. It is not fixed by logging in
to the web app at the same time.

If a call connects and drops after a few seconds with no audio, check in this order:

1. browser/web softphone and mobile use the same SIP domain/extension policy;
2. wss://wss.td1.tekomi.vn is reachable from the phone network;
3. TURN returns valid, time-limited credentials;
4. UDP/TCP/TLS firewall rules allow media and the TURN transport;
5. microphone permission is granted and iOS audio/background modes are present;
6. the PBX receives RTP in both directions.

The 4-second drop is typically SIP/WebRTC signaling or ICE/media failure, not simply a second login.
Use PBX/SIP logs and WebRTC diagnostics to distinguish rejected signaling from failed ICE/audio.

## 6. Development and quality checks

Install and run checks:

~~~bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm test -- --runInBand
pnpm run run:doctor
pnpm run check:config
~~~

Run the JavaScript app in development:

~~~bash
pnpm start
~~~

Run on a connected native device/simulator after native dependencies are installed:

~~~bash
pnpm run:ios
pnpm run:android
~~~

Before every release, manually verify:

- login/logout and installation URL validation;
- first dashboard/conversation tab;
- text, attachment, private note, assignment, labels and status changes;
- Zalo inbox send/receive and channel icon;
- VIP/priority list and conversation analysis;
- phone inbound/outbound, keypad, mute, speaker, hangup and audio in both directions;
- push notification while app is foreground, background and terminated;
- deep links, if EXPO_PUBLIC_APP_LINK_HOST is enabled;
- light/dark and keyboard dismissal on the phone screen.

## 7. EAS project initialization

Only do this once for a new checkout/project:

~~~bash
cd /Users/trung/Documents/he-sinh-thai/chatwoot-mobile-app
./node_modules/.bin/eas login
./node_modules/.bin/eas init
~~~

Because this project uses dynamic app.config.ts, EAS may print that it cannot write the project ID.
Keep extra.eas.projectId and owner in app.config.ts (they are already present), then verify with
expo config --json. Do not create a second EAS project unless a new app identity is intended.

## 8. iOS credentials and TestFlight

### 8.1 Apple prerequisites

The Apple Developer account must have:

- an App ID for vn.tekomi.chat;
- Push Notifications capability enabled;
- a distribution certificate;
- an App Store Connect app record (current app ID: 6811854991);
- an App Store Connect API key with permission to upload builds.

The .p8 file is private. Keep it at a local path such as:

~~~text
/Users/trung/Downloads/AuthKey_<KEY_ID>.p8
~~~

Do not paste its contents into chat, Git, .env, or this guide.

### 8.2 First-time credentials

Run the build interactively the first time so EAS can create/fetch the distribution certificate and
provisioning profile:

~~~bash
./node_modules/.bin/eas build --platform ios --profile testflight
~~~

When asked to generate a new distribution certificate or provisioning profile, choose yes if no valid
credential exists for this App ID. Reuse an existing valid credential when you know it matches Team ID
4PZ462R73Y and bundle ID vn.tekomi.chat.

If Apple capability synchronization fails with an invalid request document, enable/verify capabilities
manually in Apple Developer and use:

~~~bash
EXPO_NO_CAPABILITY_SYNC=1 ./node_modules/.bin/eas build --platform ios --profile testflight
~~~

### 8.3 Repeatable API-key build

Use the App Store Connect API key rather than an Apple ID password:

~~~bash
cd /Users/trung/Documents/he-sinh-thai/chatwoot-mobile-app

EXPO_NO_CAPABILITY_SYNC=1 \
EXPO_NO_KEYCHAIN=1 \
EXPO_ASC_API_KEY_PATH="$HOME/Downloads/AuthKey_<KEY_ID>.p8" \
EXPO_ASC_KEY_ID="<KEY_ID>" \
EXPO_ASC_ISSUER_ID="<ISSUER_ID>" \
EXPO_APPLE_TEAM_ID="4PZ462R73Y" \
EXPO_APPLE_TEAM_TYPE="INDIVIDUAL" \
./node_modules/.bin/eas build --platform ios --profile testflight
~~~

Notes:

- EXPO_NO_KEYCHAIN=1 prevents accidental use of a stale Apple login from the local Keychain.
- EXPO_NO_CAPABILITY_SYNC=1 is only needed when EAS's automatic capability patching is broken; the
  capabilities still need to be correct in Apple Developer.
- A build can be queued for several minutes. The EAS URL printed by the command is the source of truth.

### 8.4 Submit the iOS build

After a successful build, submit by build ID:

~~~bash
EXPO_ASC_API_KEY_PATH="$HOME/Downloads/AuthKey_<KEY_ID>.p8" \
EXPO_ASC_KEY_ID="<KEY_ID>" \
EXPO_ASC_ISSUER_ID="<ISSUER_ID>" \
./node_modules/.bin/eas submit \
  --platform ios \
  --profile testflight \
  --id <EAS_BUILD_ID> \
  --wait \
  --non-interactive
~~~

The submit profile in eas.json must contain ascAppId. If EAS asks for Apple ID despite using an API
key, verify the environment variable names and path, and use --profile testflight explicitly. The old
error iTunes service key is empty came from the Apple login/keychain path, not from the IPA itself.

Successful submission ends with Your binary has been successfully uploaded to App Store Connect.
Apple then processes the build. It may take several minutes before it appears in TestFlight.

App Store Connect page:

~~~text
https://appstoreconnect.apple.com/apps/6811854991/testflight/ios
~~~

Internal TestFlight testers can install after processing. External testing may require Apple's beta review.

## 9. Android build and Google Play

### 9.1 Build an Android App Bundle

Google Play accepts an Android App Bundle (.aab) for store release:

~~~bash
cd /Users/trung/Documents/he-sinh-thai/chatwoot-mobile-app
./node_modules/.bin/eas build --platform android --profile production
~~~

The build profile currently uses package ID vn.tekomi.chat. Keep it stable once the Play listing is
created. EAS will manage the Android keystore when credentials are configured; back up/export it through
EAS credentials management if the team needs an independent recovery copy.

For direct device testing, use an internal distribution/APK profile. A store AAB is not directly
installable on an Android phone. If the repository does not yet have a preview profile, add one based on
production with internal distribution and an APK build type before using it for ad-hoc installs.

### 9.2 Google Play service account

To submit automatically, create a Google Cloud service account with Play Console API access, invite it in
Google Play Console, and configure its JSON key through EAS credentials/submit configuration. Treat the
JSON key like a password. Do not commit it.

Then submit the completed build to the configured internal track:

~~~bash
./node_modules/.bin/eas submit \
  --platform android \
  --profile production \
  --id <EAS_ANDROID_BUILD_ID> \
  --wait
~~~

The current eas.json production submit profile targets the internal track. Confirm the track before
submitting a production release. After upload, add testers in Google Play Console and install through the
internal-testing opt-in link.

## 10. Push notification troubleshooting

### iOS error: Invalid APNs credential / THIRD_PARTY_AUTH_ERROR

This is an FCM-to-APNs authentication failure. Fix the Firebase Cloud Messaging iOS configuration:

1. confirm the Firebase iOS app bundle ID is exactly vn.tekomi.chat;
2. create or select an APNs Auth Key in the correct Apple Developer Team;
3. upload the key, Key ID and Team ID in Firebase Console > Project settings > Cloud Messaging;
4. ensure the key has not been revoked/expired and the app uses production APNs entitlement;
5. create a fresh app build after changing native credentials;
6. remove/re-register the device token and send a new test notification.

The APNs key is not the same as the App Store Connect API key. Both are .p8 files but serve different
Apple services.

### No notification appears on the phone

Check all of the following:

- notification permission was granted on iOS/Android;
- Android 13+ POST_NOTIFICATIONS permission was granted;
- Firebase files belong to the same bundle/package IDs as the build;
- the device token is stored by the app and the subscription is active;
- the server sends to the correct FCM token/topic;
- APNs credentials are valid for iOS;
- foreground notification handling is implemented separately from background notification handling;
- the app is not silenced by Focus/Do Not Disturb or notification settings.

## 11. Common errors and fixes

| Error | Meaning | Fix |
|---|---|---|
| pnpm exec eas: command not found | EAS is not on PATH or dependencies are not installed | pnpm install --frozen-lockfile; use ./node_modules/.bin/eas |
| Dynamic config cannot receive EAS project ID | EAS cannot edit app.config.ts automatically | Keep extra.eas.projectId and owner manually in app.config.ts |
| iTunes service key is empty | Apple login/keychain authentication failed | Use ASC API-key env vars; set EXPO_NO_KEYCHAIN=1 |
| Failed to patch capabilities | Apple API capability sync rejected the request | Fix capabilities in Apple Developer; temporarily use EXPO_NO_CAPABILITY_SYNC=1 |
| Credentials are not set up in non-interactive mode | EAS has not created/fetched distribution credentials | Run one interactive iOS credentials setup first |
| submit profile missing | Submit command selected the wrong profile | Add/use submit.testflight and pass --profile testflight |
| App Store Connect API Keys cannot be set up in non-interactive | API key was not fully supplied to the submit profile/env | Set ascAppId, API key path, key ID and issuer ID; use exact profile |
| Install dependencies build failure | Remote dependency/install step failed | Inspect EAS logs; validate lockfile, Node/pnpm versions and run expo-doctor |
| invalid installation URL | URL is not a valid Chatwoot installation endpoint | Use the public base URL of self-hosted Chatwoot, including https://, not /api |
| unexpected sip server | Phone inbox PBX does not match app PBX | Align the inbox/PBX configuration with td1.tekomi.vn |
| Call drops after ~4 seconds/no audio | SIP signaling or WebRTC ICE/RTP path failed | Check TURN credentials, firewall, RTP, permissions and PBX logs |
| First tab cannot connect while other tabs work | Dashboard/conversation API/data issue isolated to that flow | Compare app request/response with web source and inspect server logs for that endpoint |

## 12. Release checklist

Before publishing a new build:

- [ ] git diff contains only intended changes;
- [ ] .env, .p8, .p12, Firebase keys and service-account JSON are not staged;
- [ ] pnpm install --frozen-lockfile succeeds;
- [ ] lint, tests, expo-doctor and config checks pass;
- [ ] resolved Expo config shows T-Connect, stable IDs and correct EAS project;
- [ ] app version/build number policy is understood (eas.json uses remote auto-increment);
- [ ] Firebase/APNs credentials match the bundle/package IDs;
- [ ] Chatwoot base URL and installation URL are reachable over HTTPS;
- [ ] SIP WebSocket/STUN/TURN endpoints are reachable from a real phone;
- [ ] push, chat, Zalo, VIP, analysis and phone smoke tests pass;
- [ ] iOS build completes and is submitted with --profile testflight;
- [ ] Android AAB is submitted to the intended Play track;
- [ ] TestFlight/Play testers are notified of the exact version/build.

## 13. Useful links

- EAS project: https://expo.dev/accounts/tekomi/projects/tekomi-chat
- App Store Connect TestFlight: https://appstoreconnect.apple.com/apps/6811854991/testflight/ios
- Expo EAS build artifacts: use the URL printed by eas build (it expires eventually).
- Firebase Console: https://console.firebase.google.com/
- Apple Developer identifiers/capabilities: https://developer.apple.com/account/resources/identifiers/list
- Google Play Console: https://play.google.com/console/

## 14. Safe handover rule

When asking another developer/agent to continue, provide the repository path, the intended target
(iOS TestFlight or Android Play internal track), the EAS build ID, the current version/build number, and
the exact error log. Never provide passwords or private key contents. Rotate any credential that has been
printed in a terminal transcript, chat message, commit, or log.


## 15. Upstream sync, appearance and channel icons (added with version 4.10.6)

### 15.1 Syncing with upstream Chatwoot

~~~bash
git remote add upstream https://github.com/chatwoot/chatwoot-mobile-app.git   # once
git fetch upstream
git checkout -b sync/upstream-<version>
git merge upstream/develop
~~~

Branch `sync/upstream-4.10.6` was merged this way. Conflicts were resolved to keep T-Connect's name/slug,
pnpm version, SIP softphone (`phone` store, `PHONE_CALL`) next to upstream's native voice calls (`calls`
store, `VOICE_CALL`). `UIBackgroundModes` now includes `voip`; the iOS and Android native projects changed,
so a new native build (not an OTA update) is required.

pnpm 11 needs the `node:sqlite` module. On Node 23.3 prefix commands with
`NODE_OPTIONS="--experimental-sqlite"`, or use Node >= 23.4 / 22.13+. Corepack was broken on this machine;
`npx pnpm@11.9.0 ...` works.

### 15.2 Appearance (Settings > Appearance)

Users choose mode (system/light/dark), a style preset, an accent colour (swatches or any hex), corner
roundness and text size. Code lives in `src/theme/`:

- `accent.ts` builds a full 50-950 colour scale from one hex (the hex lands on step 700).
- `createTheme.ts` builds the twrnc instance for a look (dark palette, accent, radius, font scale).
- `tailwind.ts` exports `tailwind` as a proxy to the active look, so existing `tailwind.style(...)` calls
  follow the theme. `ThemeProvider.tsx` remounts the tree once per change and restores the current screen.
- State: `settings.theme` (mode) and `settings.appearance` (rest), persisted by redux-persist.

Known limits: dark mode is derived from the Radix dark palette plus class rewrites. Colours hard-coded in a
component (`#...` literals, `bg-[#...]`) do not follow it. Check every screen on a device in dark mode.

### 15.3 Workspace branding (optional)

If the Chatwoot server serves `https://<server>/mobile-theme.json`, users who keep "Use workspace colors" on
get that accent. Only `accent` is read:

~~~json
{ "accent": "#7C5CFC" }
~~~

Put the file in the web repo's `public/` folder. A 404 means no workspace branding.

### 15.4 Channel icons synced with the web

The web draws channel icons from Iconify data compiled at build time, so the server does not expose them.
`chatwoot/scripts/generate-channel-icons.mjs` reads the web's own icon tables and writes
`chatwoot/public/channel-icons.json`. The app fetches `<server>/channel-icons.json`, caches it, and falls back
to its bundled icons if the file is missing.

After the web changes a channel icon: `node scripts/generate-channel-icons.mjs` in the web repo, then deploy
`public/channel-icons.json`. Until it is deployed, the app shows its bundled icons.
