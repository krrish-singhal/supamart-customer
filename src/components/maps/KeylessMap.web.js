import React, { forwardRef, useRef, useState, useEffect, useImperativeHandle } from 'react';
import { View } from 'react-native';
import { createMapDocument } from '../../utils/deliveryMapDocument';
const KeylessMap = forwardRef(function KeylessMap({ initialCenter, mode = 'tracking', selected, userLocation, rider, route, showBoundary = false, tileUrl, onPick, onPreview, onMoving, onTileState, onReady, style }, ref) {
  const frame = useRef(null);
  const ready = useRef(false);
  const latest = useRef(null);
  latest.current = { selected, userLocation, rider, route, showBoundary };
  const callbacks = useRef(null);
  callbacks.current = { onPick, onPreview, onMoving, onTileState, onReady };
  const [html] = useState(() => createMapDocument({ center: initialCenter, mode, selected, userLocation, rider, route, showBoundary, tileUrl }));
  const send = command => { if (ready.current) frame.current?.contentWindow?.__MSMap?.command(command); };
  useImperativeHandle(ref, () => ({ setCenter: coordinate => send({ type: 'center', coordinate }), fitToCoordinates: points => send({ type: 'fit', points }), retry: () => send({ type: 'retry' }) }));
  useEffect(() => { send({ type: 'update', data: latest.current }); }, [selected, userLocation, rider, route, showBoundary]);
  useEffect(() => {
    const receive = event => {
      if (event.source !== frame.current?.contentWindow) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.channel !== 'ms-traders-map') return;
        if (data.type === 'ready') { ready.current = true; send({ type: 'update', data: latest.current }); callbacks.current.onReady?.(); }
        if (data.type === 'pick') callbacks.current.onPick?.(data.coordinate);
        if (data.type === 'preview') callbacks.current.onPreview?.(data.coordinate);
        if (data.type === 'moving') callbacks.current.onMoving?.();
        if (data.type === 'tilesReady') callbacks.current.onTileState?.(true);
        if (data.type === 'tileError') callbacks.current.onTileState?.(false);
      } catch { /* Ignore unrelated frame messages. */ }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  return <View style={[{ flex: 1, backgroundColor: '#e8eee4' }, style]}>{React.createElement('iframe', { ref: frame, title: 'Interactive delivery map', srcDoc: html, style: { width: '100%', height: '100%', border: 0, flex: 1 }, allow: 'geolocation', referrerPolicy: 'strict-origin-when-cross-origin' })}</View>;
});
export default KeylessMap;
