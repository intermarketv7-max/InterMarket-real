import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../database/supabaseconfig';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(() => localStorage.getItem("rol-activo"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Failsafe: Reducimos a 1 segundo para evitar esperas largas si algo falla
    const failsafeTimer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    let lastUserId = null;

    // 1. Obtener sesión actual de forma optimizada
    const getSessionAndRole = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        const currentUser = currentSession?.user ?? null;
        
        setSession(currentSession);
        setUser(currentUser);
        
        if (currentUser) {
          lastUserId = currentUser.id;
          // Validamos el rol. fetchUserRole ya maneja el loading internamente de forma optimizada
          await fetchUserRole(currentUser.id, false);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error al obtener sesión:", err);
        setLoading(false);
      } finally {
        clearTimeout(failsafeTimer);
      }
    };

    getSessionAndRole();

    // 2. Escuchar cambios de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      const currentUser = currentSession?.user ?? null;
      
      setSession(currentSession);
      setUser(currentUser);
      
      if (currentUser) {
        // Solo recargar rol si el usuario cambió o si es un inicio de sesión explícito
        if (currentUser.id !== lastUserId || event === 'SIGNED_IN') {
          lastUserId = currentUser.id;
          await fetchUserRole(currentUser.id, event === 'SIGNED_IN');
        }
      } else {
        lastUserId = null;
        setRole(null);
        localStorage.removeItem("rol-activo");
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(failsafeTimer);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (userId, forceLoading = false) => {
    // Si ya tenemos un rol en caché, liberamos el loading de inmediato para que la UI cargue
    // Mientras tanto, validamos el rol real en segundo plano
    const rolEnCache = localStorage.getItem("rol-activo");
    if (rolEnCache) {
      setRole(rolEnCache);
      setLoading(false); 
    } else if (forceLoading) {
      setLoading(true);
    }

    try {
      // 1. Consultar el rol real en la base de datos para verificar permisos (ej. si le quitaron el admin)
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id_usuario', userId)
        .single();

      if (!userError && userData?.rol) {
        const nuevoRol = userData.rol;
        
        // Solo actualizamos si el rol cambió para evitar re-renders innecesarios
        if (nuevoRol !== rolEnCache) {
          localStorage.setItem("rol-activo", nuevoRol);
          setRole(nuevoRol);
        }
      }
    } catch (error) {
      console.error('Error al validar rol en DB:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeRole = (newRole) => {
    localStorage.setItem("rol-activo", newRole);
    setRole(newRole);
  };

  const signOut = async () => {
    try {
      // 1. Limpiar estado local inmediatamente para mejorar la respuesta de la UI
      localStorage.removeItem("rol-activo");
      localStorage.removeItem("usuario-supabase");
      localStorage.removeItem("usuario");
      
      setRole(null);
      setUser(null);
      setSession(null);
      setLoading(false);

      // 2. Intentar cerrar sesión en Supabase
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error al cerrar sesión en Supabase:", err);
    }
  };

  const value = {
    session,
    user,
    role,
    loading,
    signOut,
    changeRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
