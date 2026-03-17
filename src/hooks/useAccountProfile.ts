import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirestoreDb } from '@/lib/firebase';
import type { AccountProfile } from '@/lib/account';

export const useAccountProfile = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<AccountProfile>({
    username: null,
    email: null,
    uid: null,
  });

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) {
        setProfile({
          username: null,
          email: null,
          uid: null,
        });
        setIsLoading(false);
        return;
      }

      let username: string | null = null;
      const db = getFirestoreDb();
      if (db) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as { username?: string };
            username = data.username ?? null;
          }
        } catch (error) {
          console.error('Failed to load account profile:', error);
        }
      }

      setProfile({
        username,
        email: user.email,
        uid: user.uid,
      });
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  return { isLoading, profile };
};
