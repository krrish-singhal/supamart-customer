import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useConfig } from '../context/ConfigContext';
import { storeStatus } from '../config/storeHours';
export default function useStoreStatus() {
  const { config } = useConfig();
  const offset = Number.isFinite(config?.serverTime) && Number.isFinite(config?.receivedAt) ? config.serverTime - config.receivedAt : 0;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let timer;
    const tick = () => { setNow(Date.now()); clearTimeout(timer); timer = setTimeout(tick, 60000 - ((Date.now() + offset) % 60000) + 20); };
    tick();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') tick(); });
    return () => { clearTimeout(timer); listener.remove(); };
  }, [offset]);
  return storeStatus(now + offset);
}
