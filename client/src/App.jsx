import React, { useEffect, useState } from 'react';

function App() {
  const [cosmetics, setCosmetics] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setloading] = useState(false);

  // Função para buscar cosméticos da API
  const fetchCosmetics = async (pageToFetch) => {
    setloading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/cosmetics?page=${pageToFetch}`);
      const data = await response.json();
      
      // Se for a página 1 substitui, senão concatena ao final
      if (pageToFetch === 1) {
        setCosmetics(data.data);
      } else {
        setCosmetics((prev) => [...prev, ...data.data]);
      }
    } catch (error) {
      console.error('Erro ao buscar cosméticos:', error);
    } finally {
      setloading(false);
    }
  };

  // useEffect para buscar cosméticos na montagem do componente
  useEffect(() => {
    fetchCosmetics(1);
  }, []);

  // Função para carregar mais cosméticos
  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCosmetics(nextPage);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Loja do Fortnite (Desafio ESO)</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
        {cosmetics.map(item => (
          <div key={item.id} style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
            <img src={item.image_url} alt={item.name} style={{ width: '100px', height: '100px', objectFit: 'contain' }} />
            <h3 style={{ fontSize: '14px', margin: '10px 0' }}>{item.name}</h3>
            {item.price > 0 && <p>💰 {item.price}</p>}
          </div>
        ))}
      </div>

      {loading && <p>Carregando...</p>}
      
      {!loading && (
        <button 
          onClick={loadMore}
          style={{ display: 'block', margin: '20px auto', padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
        >
          Carregar Mais
        </button>
      )}
    </div>
  );
}
export default App;