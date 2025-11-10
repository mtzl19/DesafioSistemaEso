import React, { useEffect, useState } from 'react';
import Login from './Login';
import Register from './Register';

function App() {
    // Estados de Autenticação
    const [user, setUser] = useState(null);
    const [showRegister, setShowRegister] = useState(false);

    // Estados da Loja
    const [cosmetics, setCosmetics] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [nameFilter, setNameFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [rarityFilter, setRarityFilter] = useState('');

    // Verificar se já existe usuário logado ao abrir o app
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
            fetchCosmetics(1); // Já busca os itens se estiver logado
        }
    }, []);

    const handleLoginSuccess = (userData) => {
        setUser(userData);
        fetchCosmetics(1);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setCosmetics([]); // Limpa a lista ao deslogar
    };

    // --- FUNÇÕES DA LOJA ---
    const fetchCosmetics = async (pageToFetch, resetList = false) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', pageToFetch);
            if (nameFilter.trim()) params.append('name', nameFilter);
            if (typeFilter.trim()) params.append('type', typeFilter);
            if (rarityFilter.trim()) params.append('rarity', rarityFilter);

            const url = `http://localhost:3001/api/cosmetics?${params.toString()}`;
            const response = await fetch(url);
            const data = await response.json();

            if (pageToFetch === 1 || resetList) {
                setCosmetics(data.data);
                setPage(1);
            } else {
                setCosmetics((prev) => [...prev, ...data.data]);
            }
        } catch (error) {
            console.error('Erro ao buscar cosméticos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        setCosmetics([]);
        await fetchCosmetics(1, true);
    }

    const loadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchCosmetics(nextPage);
    };

    // --- RENDERIZAÇÃO ---

    // Se não estiver logado, mostra tela de login/registro
    if (!user) {
        return (
            <div style={{ fontFamily: 'sans-serif' }}>
                <h1 style={{ textAlign: 'center', color: '#333' }}>Fortnite Item Shop - Desafio ESO</h1>
                {showRegister ? (
                    <Register onLoginSuccess={handleLoginSuccess} onSwitchToLogin={() => setShowRegister(false)} />
                ) : (
                    <Login onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => setShowRegister(true)} />
                )}
            </div>
        );
    }

    // Se estiver logado, mostra a loja
    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            {/* CABEÇALHO DO USUÁRIO */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '15px', backgroundColor: '#2c3e50', color: 'white', borderRadius: '8px' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Olá {user.username}!</h2>
                    <p style={{ margin: '5px 0 0 0', color: '#f1c40f', fontWeight: 'bold' }}>Saldo: {user.balance} V-Bucks</p>
                </div>
                <button onClick={handleLogout} style={{ padding: '8px 15px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Sair
                </button>
            </header>

            {/* ÁREA DE FILTROS */}
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Nome</label>
                    <input
                        type="text"
                        placeholder="Ex: Aura..."
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '200px' }}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Raridade</label>
                    <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '150px' }}>
                        <option value="">Todas</option>
                        <option value="common">Comum</option>
                        <option value="uncommon">Incomum</option>
                        <option value="rare">Raro</option>
                        <option value="epic">Épico</option>
                        <option value="legendary">Lendário</option>
                        <option value="marvel">Marvel</option>
                        <option value="dc">DC</option>
                        <option value="icon">Icon</option>
                        <option value="starwars">Star Wars</option>
                        <option value="gaminglegends">Gaming Legends</option>
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Tipo</label>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '150px' }}>
                        <option value="">Todos</option>
                        <option value="outfit">Traje</option>
                        <option value="backpack">Mochila</option>
                        <option value="pickaxe">Picareta</option>
                        <option value="glider">Asa-delta</option>
                        <option value="emote">Gesto</option>
                        <option value="wrap">Envelopamento</option>
                    </select>
                </div>
                <button onClick={handleSearch} style={{ padding: '10px 24px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', alignSelf: 'flex-end' }}>
                    FILTRAR
                </button>
            </div>

            {/* LISTA DE ITENS */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
                {cosmetics.map((item) => (
                    <div key={item.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '10px', width: '200px', textAlign: 'center', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '180px', objectFit: 'contain', marginBottom: '10px' }} />
                            <h3 style={{ fontSize: '16px', margin: '5px 0', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.name}</h3>
                            <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '12px', backgroundColor: '#eee', fontSize: '12px', color: '#555', marginBottom: '10px' }}>
                                {item.rarity ? item.rarity.toUpperCase() : 'COMUM'}
                            </span>
                        </div>
                        
                        {item.price > 0 ? (
                            <button style={{ width: '100%', padding: '10px', backgroundColor: '#f1c40f', border: 'none', borderRadius: '4px', color: '#333', fontWeight: 'bold', cursor: 'pointer' }}>
                                COMPRAR POR {item.price}
                            </button>
                        ) : (
                            <p style={{ color: '#999', fontStyle: 'italic', fontSize: '14px' }}>Não disponível para venda</p>
                        )}
                    </div>
                ))}
            </div>

            {/* CARREGAR MAIS */}
            <div style={{ textAlign: 'center', marginTop: '30px', marginBottom: '50px' }}>
                {loading && <p>Carregando...</p>}
                {!loading && cosmetics.length > 0 && (
                    <button onClick={loadMore} style={{ padding: '12px 30px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '30px', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        CARREGAR MAIS ITENS
                    </button>
                )}
            </div>
        </div>
    );
}

export default App;