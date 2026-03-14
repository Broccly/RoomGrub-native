import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';
const useLocalSupabase = process.env.EXPO_PUBLIC_USE_LOCAL_SUPABASE === 'true';

const SUPABASE_URL = useLocalSupabase
  ? 'http://192.168.0.160:54321'
  : 'https://vmvhoczslqyxvcuztvoy.supabase.co';

const SUPABASE_ANON_KEY = useLocalSupabase
  ? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdmhvY3pzbHF5eHZjdXp0dm95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0NjEyNDYsImV4cCI6MjA2NzAzNzI0Nn0.HTCMI7pYE1zaS40Wfo61bMS3eoyJ4YCgnfhMFGBOKi8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb,
  },
});
