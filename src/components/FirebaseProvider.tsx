import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError } from '../lib/firebase';
import { UserProfile, UserRole, OperationType } from '../types';

interface FirebaseContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfileRole: (userId: string, newRole: UserRole) => Promise<void>;
  activeRole: UserRole | null;
  setSimulatedRole: (role: UserRole | null) => void;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(null);

  // Authenticated user's active role is either their simulated role (if they are Owner simulating another role) or their actual database role.
  const activeRole = simulatedRole || (profile ? profile.role : null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(userDocRef).catch((err) => {
            handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
          });

          if (docSnap && docSnap.exists()) {
            const data = docSnap.data();
            const createdAtDate = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
            const updatedAtDate = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date();

            setProfile({
              uid: data.uid,
              email: data.email,
              displayName: data.displayName,
              photoURL: data.photoURL,
              role: data.role as UserRole,
              createdAt: createdAtDate,
              updatedAt: updatedAtDate,
            });
          } else {
            // New User profile registration
            // Bootstrap owner check
            const defaultRole: UserRole = firebaseUser.email === 'sideincomechanel@gmail.com' ? 'Owner' : 'Kasir';
            
            const newProfile: Omit<UserProfile, 'createdAt' | 'updatedAt'> = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'ASP Staff',
              photoURL: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop',
              role: defaultRole,
            };

            await setDoc(userDocRef, {
              ...newProfile,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }).catch((err) => {
              handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
            });

            setProfile({
              ...newProfile,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        } catch (err: any) {
          console.error("Error setting up user profile:", err);
          setError(err.message || "Failed to load user profile");
        } finally {
          setLoading(false);
        }
      } else {
        setProfile(null);
        setSimulatedRole(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setError(null);
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google login failed:", err);
      setError(err.message || "Google Login failed");
      setLoading(false);
    }
  };

  const logout = async () => {
    setError(null);
    setLoading(true);
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error("Logout failed:", err);
      setError(err.message || "Logout failed");
    } finally {
      setLoading(false);
    }
  };

  const updateProfileRole = async (userId: string, newRole: UserRole) => {
    setError(null);
    try {
      const userDocRef = doc(db, 'users', userId);
      await setDoc(userDocRef, {
        role: newRole,
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      });

      // If updating current user, refresh state
      if (user && user.uid === userId && profile) {
        setProfile({
          ...profile,
          role: newRole,
          updatedAt: new Date(),
        });
      }
    } catch (err: any) {
      console.error("Update role failed:", err);
      setError(err.message || "Failed to update role");
      throw err;
    }
  };

  return (
    <FirebaseContext.Provider
      value={{
        user,
        profile,
        loading,
        error,
        loginWithGoogle,
        logout,
        updateProfileRole,
        activeRole,
        setSimulatedRole,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}
