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
    let lastUserId = null;
    let isInitialMount = true;

    // Failsafe: Reducimos a 800ms para evitar esperas largas si algo falla
    const failsafeTimer = setTimeout(() => {
      setLoading(false);
    }, 800);

    // 1. Obtener sesión inicial y configurar listener en una sola lógica
    const initAuth = async () => {
      try {
        console.log("🔐 Inicializando autenticación...");
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        const initialUser = initialSession?.user ?? null;
        console.log("📋 Sesión inicial obtenida:", initialUser?.email);
        setSession(initialSession);
        setUser(initialUser);
        
        if (initialUser) {
          lastUserId = initialUser.id;
          await fetchUserRole(initialUser.id, false);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("❌ Error en inicialización de auth:", err);
        setLoading(false);
      } finally {
        isInitialMount = false;
        clearTimeout(failsafeTimer);
      }
    };

    initAuth();

    // 2. Escuchar cambios de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("🔄 onAuthStateChange:", event, "user:", currentSession?.user?.email);
      // Ignorar el evento inicial si ya lo manejamos en initAuth
      if (isInitialMount && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) return;

      const currentUser = currentSession?.user ?? null;
      setSession(currentSession);
      setUser(currentUser);
      
      if (currentUser) {
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
    console.log("👤 fetchUserRole:", userId, "forceLoading:", forceLoading);
    // Si ya tenemos un rol en caché, liberamos el loading de inmediato para que la UI cargue
    const rolEnCache = localStorage.getItem("rol-activo");
    if (rolEnCache) {
      console.log("✓ Rol en caché:", rolEnCache);
      setRole(rolEnCache);
      setLoading(false); 
    } else if (forceLoading) {
      setLoading(true);
    }

    try {
      // 1. Consultar el rol real y estado de restricción en la base de datos
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('rol, restringido')
        .eq('id_usuario', userId)
        .single();

      if (!userError && userData) {
        console.log("📊 Usuario encontrado en DB:", userData);
        // Si el usuario está restringido, cerramos su sesión inmediatamente
        if (userData.restringido) {
          await signOut();
          alert("Tu cuenta ha sido restringida ya que no cumples con la politicas.");
          return;
        }

        const dbRole = userData.rol;
        
        // Lógica de validación de rol:
        // Si el usuario es Vendedor en la DB, puede actuar como Comprador sin que se le resetee.
        // Si es Comprador en la DB pero intenta actuar como Vendedor, lo reseteamos por seguridad.
        
        let rolFinal = rolEnCache;

        if (!rolEnCache) {
          // Si no hay nada en caché, usamos el de la DB
          rolFinal = dbRole;
        } else {
          // Validar si el rol en caché es permitido para su nivel en DB
          if (dbRole === 'comprador' && rolEnCache === 'vendedor') {
            // Un comprador no puede actuar como vendedor si no tiene el rol en DB
            rolFinal = 'comprador';
          } 
          // Si es vendedor o admin en DB, permitimos que mantenga su rol de 'comprador' si lo eligió
        }

        // Solo actualizamos si el rol final es distinto al que tenemos en estado/caché
        if (rolFinal !== rolEnCache) {
          console.log("🔄 Rol actualizado:", rolFinal);
          localStorage.setItem("rol-activo", rolFinal);
          setRole(rolFinal);
        }
      }
    } catch (error) {
      console.error('❌ Error al validar rol en DB:', error);
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
      console.log("🚪 Cerrando sesión...");
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
      console.log("✓ Sesión cerrada");
    } catch (err) {
      console.error("❌ Error al cerrar sesión en Supabase:", err);
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
