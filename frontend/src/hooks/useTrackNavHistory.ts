import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { locationKey, pushNavHistory } from '../utils/navHistory';

/** Track hash-route visits for smart Back. */
export function useTrackNavHistory() {
  const location = useLocation();
  useEffect(() => {
    pushNavHistory(locationKey(location.pathname, location.search));
  }, [location.pathname, location.search]);
}
