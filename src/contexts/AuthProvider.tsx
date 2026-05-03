import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { logger } from '../lib/logger';

interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'accountant' | 'viewer';
  tenantId: string; // The company ID this user belongs to
  createdAt: string;
  permissions?: string[]; // Array of allowed modules: 'expenses', 'revenues', 'payroll', 'banks', 'reports'
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isBootstrapping: boolean;
  authError: string | null;
  isAccountant: boolean;
  isAdmin: boolean;
  isViewer: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isBootstrapping: false,
  authError: null,
  isAccountant: false,
  isAdmin: false,
  isViewer: false,
});

export const useAuth = () => useContext(AuthContext);

let hasInitializedSession = false;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      const handleAuthChange = async () => {
        setUser(currentUser);
        setAuthError(null);
        
        if (currentUser) {
          logger.info(`User authenticated: ${currentUser.email}`, { uid: currentUser.uid });
          setIsBootstrapping(true);
          try {
            // PHASE 2 & 3: SINGLE INIT EXECUTION WITH FALLBACK
            let idTokenResult;
            try {
              idTokenResult = await currentUser.getIdTokenResult(true);
            } catch (networkErr: any) {
              console.warn(`FRONTEND: getIdTokenResult(true) failed. Error:`, networkErr.message);
              idTokenResult = await currentUser.getIdTokenResult(false);
            }
            
            // Check claims
            let claimsValid = !!(idTokenResult.claims && idTokenResult.claims.role && idTokenResult.claims.tenantId);

            if (!claimsValid && !hasInitializedSession) {
              hasInitializedSession = true;
              console.log(`FRONTEND: Claims missing, calling init ONCE ONLY...`);
              
              const token = await currentUser.getIdToken(false);
              const res = await fetch('/api/erp/users/init', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Server init returned ${res.status}: ${errorText}`);
              }
  
              const data = await res.json();
              if (data.error === 'QUOTA_LIMIT_REACHED') {
                 throw new Error("Quota exceeded during initialization");
              }

              if (!data.success || !data.role) {
                throw new Error("Init response failed or missing explicitly defined role.");
              }

              // Re-check claims with retries (max 2 times)
              let retries = 0;
              while (retries < 2) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                try {
                  idTokenResult = await currentUser.getIdTokenResult(true);
                } catch (e) {}
                
                if (idTokenResult.claims && idTokenResult.claims.role && idTokenResult.claims.tenantId) {
                  claimsValid = true;
                  break;
                }
                retries++;
              }
            } else if (!claimsValid && hasInitializedSession) {
               // We already tried init this session
               let retries = 0;
               while (retries < 2 && !claimsValid) {
                 await new Promise((resolve) => setTimeout(resolve, 500));
                 try {
                   idTokenResult = await currentUser.getIdTokenResult(true);
                 } catch (e) {}
                 
                 if (idTokenResult.claims && idTokenResult.claims.role && idTokenResult.claims.tenantId) {
                   claimsValid = true;
                   break;
                 }
                 retries++;
               }
            }

            // At this point, we MUST have valid claims
            if (claimsValid && idTokenResult?.claims) {
              const profileData: any = {
                uid: currentUser.uid,
                email: currentUser.email || '',
                role: idTokenResult.claims.role as string,
                tenantId: idTokenResult.claims.tenantId as string,
                permissions: idTokenResult.claims.permissions as string[] || []
              };
              console.log(`FRONTEND: Profile applied. Role: [${profileData.role}], Tenant: [${profileData.tenantId}]`);
              setProfile(profileData);
              setIsBootstrapping(false);
            } else {
              throw new Error("AUTH INITIALIZATION FAILED. Server failed to inject required claims into token after retries.");
            }
          } catch (error: any) {
            console.error("======================================");
            console.error("CRITICAL AUTH FAILURE IN AUTHPROVIDER");
            console.error(error);
            console.error("======================================");
            setAuthError(error.message || "Auth initialization failed.");
            setProfile(null);
            setIsBootstrapping(false);
          }
        } else {
          logger.info('User signed out');
          setProfile(null);
          setIsBootstrapping(false);
        }
        
        setLoading(false);
      };
      
      handleAuthChange().catch(e => console.warn("Expected API rejection caught in auth state:", e));
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    profile,
    loading,
    isBootstrapping,
    authError,
    isAdmin: profile?.role === 'admin',
    isAccountant: profile?.role === 'accountant' || profile?.role === 'admin',
    isViewer: true // Everyone can view basic dashboards
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
