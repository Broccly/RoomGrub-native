import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function useUserRole() {
  const [role, setRole] = useState<'Admin' | 'Member' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    api
      .bootstrap()
      .then((data) => {
        if (!active) return;
        setRole(data.membership.role);
      })
      .catch(() => {
        if (!active) return;
        setRole(null);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { role, loading };
}
