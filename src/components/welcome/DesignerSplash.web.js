import React, { useEffect, useRef, useState } from 'react';
import { createSplashDocument } from '../../utils/splashDocument';

export default function DesignerSplash({ reducedMotion, paused, onAction }) {
  const frame = useRef(null);
  const [html] = useState(() => createSplashDocument({ reducedMotion, paused }));
  const latest = useRef(null);
  latest.current = { reducedMotion, paused, onAction };
  const sendState = () => frame.current?.contentWindow?.__MSSplash?.setState({ reducedMotion: latest.current.reducedMotion, paused: latest.current.paused });
  useEffect(() => { sendState(); }, [reducedMotion, paused]);
  useEffect(() => {
    const receive = event => {
      if (event.source !== frame.current?.contentWindow) return;
      let data;
      try { data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch { return; }
      if (data?.channel !== 'ms-traders-splash') return;
      if (data.action === 'ready') sendState();
      if (!latest.current.paused && (data.action === 'start' || data.action === 'login')) latest.current.onAction(data.action);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  return React.createElement('iframe', {
    ref: frame,
    title: 'MS Traders welcome',
    srcDoc: html,
    onLoad: sendState,
    style: { flex: 1, width: '100%', height: '100%', border: 0, backgroundColor: '#0A7C47' },
  });
}
