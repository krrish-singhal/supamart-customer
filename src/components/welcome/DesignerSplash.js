import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { createSplashDocument } from '../../utils/splashDocument';

export default function DesignerSplash({ reducedMotion, paused, onAction, onError }) {
  const view = useRef(null);
  const [ready, setReady] = useState(false);
  const [html] = useState(() => createSplashDocument({ reducedMotion, paused }));
  const state = useRef(null);
  state.current = { reducedMotion, paused };
  const sendState = () => view.current?.injectJavaScript(`window.__MSSplash?.setState(${JSON.stringify(state.current)});true;`);
  useEffect(() => { if (ready) sendState(); }, [reducedMotion, paused, ready]);
  const message = event => {
    let data;
    try { data = JSON.parse(event.nativeEvent.data); } catch { return; }
    if (data?.channel !== 'ms-traders-splash') return;
    if (data.action === 'ready') { sendState(); setReady(true); }
    if (!paused && (data.action === 'start' || data.action === 'login')) onAction(data.action);
  };
  return <WebView
    ref={view}
    source={{ html, baseUrl: 'about:blank' }}
    injectedJavaScriptBeforeContentLoaded={`window.addEventListener('DOMContentLoaded',()=>{document.documentElement.dataset.reducedMotion=${JSON.stringify(String(reducedMotion))};});true;`}
    onMessage={message}
    onError={onError}
    onContentProcessDidTerminate={() => { setReady(false); view.current?.reload(); }}
    onShouldStartLoadWithRequest={request => request.url === 'about:blank'}
    originWhitelist={['*']}
    javaScriptEnabled
    mixedContentMode="never"
    setSupportMultipleWindows={false}
    textZoom={100}
    style={styles.frame}
  />;
}
const styles = StyleSheet.create({ frame: { flex: 1, backgroundColor: '#0A7C47' } });
