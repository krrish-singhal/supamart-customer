import React, { forwardRef, useRef, useState, useEffect, useImperativeHandle, useMemo } from 'react';
import { WebView } from 'react-native-webview';
import { Linking, View, StyleSheet, AppState, Platform } from 'react-native';
import { createMapDocument } from '../../utils/deliveryMapDocument';

const KeylessMap = forwardRef(function KeylessMap(
  {
    initialCenter,
    mode = 'tracking',
    selected,
    userLocation,
    rider,
    route,
    showBoundary = false,
    tileUrl,
    onPick,
    onPreview,
    onMoving,
    onTileState,
    onReady,
    onError,
    style,
  },
  ref
) {
  const view = useRef(null);
  const ready = useRef(false);
  const latest = useRef(null);
  latest.current = { selected, userLocation, rider, route, showBoundary };

  // Track latest props to build fresh HTML upon remount
  const latestPropsRef = useRef({
    initialCenter,
    mode,
    selected,
    userLocation,
    rider,
    route,
    showBoundary,
    tileUrl,
  });
  latestPropsRef.current = {
    initialCenter,
    mode,
    selected,
    userLocation,
    rider,
    route,
    showBoundary,
    tileUrl,
  };

  // Remount key to tear down dead Android WebView instances after backgrounding or process termination
  const [mapKey, setMapKey] = useState(0);
  const appState = useRef(AppState.currentState);

  // Re-generate HTML only on initial mount or when remounting (mapKey changes)
  const html = useMemo(() => {
    const p = latestPropsRef.current;
    const bestCenter = p.selected || p.initialCenter || p.rider || p.userLocation;
    return createMapDocument({
      center: bestCenter,
      mode: p.mode,
      selected: p.selected,
      userLocation: p.userLocation,
      rider: p.rider,
      route: p.route,
      showBoundary: p.showBoundary,
      tileUrl: p.tileUrl,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapKey, mode, tileUrl]);

  const send = (command) => {
    if (ready.current) {
      view.current?.injectJavaScript(
        `window.__MSMap&&window.__MSMap.command(${JSON.stringify(command).replace(/</g, '\\u003c')});true;`
      );
    }
  };

  useImperativeHandle(ref, () => ({
    setCenter: (coordinate) => send({ type: 'center', coordinate }),
    fitToCoordinates: (points) => send({ type: 'fit', points }),
    retry: () => send({ type: 'retry' }),
    invalidate: () => send({ type: 'resize' }),
    reload: () => {
      ready.current = false;
      setMapKey((k) => k + 1);
    },
  }));

  // Update map state dynamically while running
  useEffect(() => {
    send({ type: 'update', data: latest.current });
  }, [selected, userLocation, rider, route, showBoundary]);

  // Handle AppState transitions (Background -> Foreground/Active)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const isComingFromBackground = appState.current.match(/inactive|background/);
      if (isComingFromBackground && nextAppState === 'active') {
        // App resumed from background. Force fresh native WebView remount so Android renders GPU surface cleanly.
        ready.current = false;
        setMapKey((prev) => prev + 1);
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  const message = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.channel !== 'ms-traders-map') return;
      if (data.type === 'ready') {
        ready.current = true;
        send({ type: 'update', data: latest.current });
        onReady?.();
      }
      if (data.type === 'pick') onPick?.(data.coordinate);
      if (data.type === 'preview') onPreview?.(data.coordinate);
      if (data.type === 'moving') onMoving?.();
      if (data.type === 'tilesReady') onTileState?.(true);
      if (data.type === 'tileError') onTileState?.(false);
    } catch {
      /* Ignore messages that do not match the map bridge. */
    }
  };

  return (
    <View style={[styles.map, style]}>
      <WebView
        key={`keyless-map-${mapKey}`}
        ref={view}
        source={{ html, baseUrl: 'about:blank' }}
        originWhitelist={['*']}
        onMessage={message}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled
        androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
        applicationNameForUserAgent="MSTradersDelivery/1.0 (in.mstraders.grocery)"
        mixedContentMode="never"
        setSupportMultipleWindows={false}
        onError={(err) => {
          console.warn('[KeylessMap] WebView error:', err?.nativeEvent);
          onError?.(err);
        }}
        onRenderProcessGone={(syntheticEvent) => {
          console.warn('[KeylessMap] Android render process gone, recovering:', syntheticEvent?.nativeEvent);
          ready.current = false;
          setMapKey((k) => k + 1);
        }}
        onContentProcessDidTerminate={() => {
          console.warn('[KeylessMap] iOS content process did terminate, recovering');
          ready.current = false;
          setMapKey((k) => k + 1);
        }}
        onShouldStartLoadWithRequest={(request) => {
          // Subresources (tile images, fonts, blobs, data URIs) and initial about:blank are always allowed
          if (
            !request.url ||
            request.url === 'about:blank' ||
            request.url.startsWith('data:') ||
            request.isTopFrame === false
          ) {
            return true;
          }
          // Tile requests
          if (request.url.includes('tile.openstreetmap.org')) {
            return true;
          }
          // External links (e.g. OpenStreetMap copyright attribution) open in device browser
          if (request.url.startsWith('http://') || request.url.startsWith('https://')) {
            Linking.openURL(request.url).catch(() => {});
            return false;
          }
          return true;
        }}
        style={[styles.map, { opacity: 0.99 }]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  map: {
    flex: 1,
    backgroundColor: '#e8eee4',
  },
});

export default KeylessMap;
