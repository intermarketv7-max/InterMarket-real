import React, { useRef, useEffect } from 'react';

const loadTableauScript = () => {
  return new Promise((resolve, reject) => {
    if (window.tableau) {
      resolve(window.tableau);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://public.tableau.com/javascripts/api/tableau-2.9.2.min.js';
    script.async = true;
    script.onload = () => {
      if (window.tableau && typeof window.tableau.Viz === 'function') {
        resolve(window.tableau);
      } else {
        reject(new Error('Tableau API no se cargó correctamente o no exportó Viz'));
      }
    };
    script.onerror = () => reject(new Error('No se pudo cargar el script de Tableau'));
    document.body.appendChild(script);
  });
};

export const DasboardAdmin = () => {
  const vizContainerRef = useRef(null);
  const vizRef = useRef(null);

  const vistaUrl = 'https://public.tableau.com/views/Intermaket_etl/DescuentosaplicadosenInterMaeket?:language=es-ES&:sid=&:redirect=auth&:display_count=n&:origin=viz_share_link';

  useEffect(() => {
    let isMounted = true;

    const initializeViz = async () => {
      if (!vizContainerRef.current) return;

      try {
        const tableau = await loadTableauScript();

        if (!isMounted) return;

        const options = {
          hideTabs: false,
          toolbar: 'bottom',
          onFirstInteractive: () => {
            console.log('¡El tablero de Tableau está listo!');
          },
        };

        vizRef.current = new tableau.Viz(vizContainerRef.current, vistaUrl, options);
      } catch (error) {
        console.error('Error inicializando Tableau:', error);
      }
    };

    initializeViz();

    return () => {
      isMounted = false;
      if (vizRef.current) {
        vizRef.current.dispose();
      }
    };
  }, [vistaUrl]);

  return (
    <div style={{ width: '100%', minHeight: '800px', padding: '20px' }}>
      <h2>Mi Reporte de Tableau</h2>
      <div
        ref={vizContainerRef}
        style={{ width: '100%', height: '760px', border: '1px solid #ddd' }}
      />
    </div>
  );
};

export default DasboardAdmin;