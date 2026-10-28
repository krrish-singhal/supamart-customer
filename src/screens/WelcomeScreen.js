import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import DesignerSplash from '../components/welcome/DesignerSplash';
import { fonts } from '../theme/typography';

export default function WelcomeScreen({ navigation, onFinish, onLogin }) {
  const focused = useIsFocused();
  const [reducedMotion, setReducedMotion] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const navigating = useRef(false);
  useEffect(() => {
    let mounted = true;
    let changed = false;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted && !changed) setReducedMotion(value);
    }).catch(() => { if (mounted && !changed) setReducedMotion(true); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      changed = true;
      setReducedMotion(value);
    });
    return () => { mounted = false; subscription.remove(); };
  }, []);
  useEffect(() => { if (focused) navigating.current = false; }, [focused]);
  const followLink = action => {
    if (navigating.current || !focused) return;
    navigating.current = true;
    // Locate.dc.html is a designer prototype, not an app route. Sign-in already
    // directs new customers into delivery setup through AuthContext/Navigation.
    if (action === 'start' && onFinish) onFinish();
    else if (action === 'login' && onLogin) onLogin();
    else navigation.navigate('Login');
  };
  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0A7C47" />
      {failed ? <View style={styles.error}>
        <Text style={styles.errorText}>Could not load the welcome screen.</Text>
        <Pressable accessibilityRole="button" onPress={() => { setAttempt(value => value + 1); setFailed(false); }} style={styles.button}><Text style={styles.buttonText}>Retry</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => followLink('login')} style={styles.button}><Text style={styles.buttonText}>Log in</Text></Pressable>
      </View> : reducedMotion !== null && <DesignerSplash key={attempt} reducedMotion={reducedMotion} paused={!focused} onAction={followLink} onError={() => setFailed(true)} />}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A7C47' },
  error: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  errorText: { fontFamily: fonts.regular, color: '#FFFFFF', textAlign: 'center' },
  button: { backgroundColor: '#FFFFFF', borderRadius: 14, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: fonts.bold, color: '#0A7C47', fontSize: 16 },
});
