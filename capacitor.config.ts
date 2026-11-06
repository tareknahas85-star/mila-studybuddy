import type { CapacitorConfig } from '@capacitor/cli'

// تغليف التطبيق كـ APK: نفس ملفات الويب المبنية (dist) جوّا WebView محلي —
// بلا سيرفر، فالتطبيق بيفتح ويشتغل أوفلاين.
const config: CapacitorConfig = {
  appId: 'com.studybuddy.mila',
  appName: 'ميلا',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
}

export default config
