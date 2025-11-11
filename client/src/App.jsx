import React, { useEffect, useState } from 'react';
import Login from './Login';
import Register from './Register';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- CORES DE RARIDADE DO FORTNITE ---
// Isso fará cada card ter uma cor de fundo baseada na sua raridade real do jogo.
const RARITY_COLORS = {
    common: '#6c757d',      // Cinza
    uncommon: '#5da81d',    // Verde
    rare: '#2dc0fd',        // Azul Claro
    epic: '#a855f7',        // Roxo
    legendary: '#ea580c',   // Laranja Forte
    mythic: '#eab308',      // Dourado/Amarelo
    marvel: '#ef4444',      // Vermelho Marvel
    dc: '#3b82f6',          // Azul DC
    icon: '#14b8a6',        // Turquesa Icon Series
    gaminglegends: '#6366f1', // Indigo
    starwars: '#2563eb',    // Azul Star Wars
    default: '#1e293b'      // Cor padrão se não achar a raridade
};

function App() {
    // --- ESTADOS (Iguais ao anterior) ---
    const [user, setUser] = useState(null);
    const [currentView, setCurrentView] = useState('shop');
    const [cosmetics, setCosmetics] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [purchasedIds, setPurchasedIds] = useState([]);

    // --- FILTROS ---
    const [nameFilter, setNameFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [rarityFilter, setRarityFilter] = useState('');
    const [forSaleFilter, setForSaleFilter] = useState(false);
    const [isNewFilter, setIsNewFilter] = useState(false);
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');

    const [itemToBuy, setItemToBuy] = useState(null);

    // --- EFEITOS E FUNÇÕES DE BUSCA (Lógica mantida, apenas visual mudou) ---
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        if (storedUser && storedToken) {
            try {
                setUser(JSON.parse(storedUser));
                fetchPurchasedItems(storedToken);
            } catch (error) {
                localStorage.removeItem('user'); localStorage.removeItem('token');
            }
        }
        fetchCosmetics(1);
    }, []);

    const fetchPurchasedItems = async (token) => {
        try {
            const response = await fetch('http://localhost:3001/api/user/purchased-ids', { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) setPurchasedIds(await response.json());
        } catch (error) { console.error(error); }
    };

    const fetchCosmetics = async (pageToFetch, resetList = false) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', pageToFetch);
            if (nameFilter.trim()) params.append('name', nameFilter);
            if (typeFilter.trim()) params.append('type', typeFilter);
            if (rarityFilter.trim()) params.append('rarity', rarityFilter);
            if (forSaleFilter) params.append('forSale', 'true');
            if (isNewFilter) params.append('isnew', 'true');
            params.append('sort', sortBy);
            params.append('order', sortOrder);

            const response = await fetch(`http://localhost:3001/api/cosmetics?${params.toString()}`);
            const data = await response.json();
            if (pageToFetch === 1 || resetList) { setCosmetics(data.data); setPage(1); }
            else { setCosmetics((prev) => [...prev, ...data.data]); }
        } catch (error) { toast.error("Erro ao carregar a loja."); } finally { setLoading(false); }
    };

    const handleFilterChange = () => { setCosmetics([]); fetchCosmetics(1, true); }
    useEffect(() => { handleFilterChange(); }, [sortBy, sortOrder]);
    const loadMore = () => { const nextPage = page + 1; setPage(nextPage); fetchCosmetics(nextPage); };

    const handleLoginSuccess = (userData) => {
        setUser(userData); setCurrentView('shop'); toast.success(`Bem-vindo, ${userData.username}!`);
        fetchPurchasedItems(localStorage.getItem('token'));
    };
    const handleLogout = () => {
        localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); setPurchasedIds([]); toast.info("Logout realizado.");
    };
    const openBuyModal = (item) => {
        if (!user) { toast.warning("Faça login para comprar!"); setCurrentView('login'); return; }
        setItemToBuy(item);
    };
    const confirmPurchase = async () => {
        if (!itemToBuy) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:3001/api/user/purchase/${itemToBuy.id}`, {
                method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro na compra.');
            toast.success(`🎉 ${itemToBuy.name} obtido!`);
            setUser({ ...user, balance: data.newBalance });
            localStorage.setItem('user', JSON.stringify({ ...user, balance: data.newBalance }));
            setPurchasedIds([...purchasedIds, itemToBuy.id]);
        } catch (error) { toast.error(error.message); } finally { setItemToBuy(null); }
    };

    if (currentView === 'login' || currentView === 'register') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)' }}>
                <button onClick={() => setCurrentView('shop')} style={{ position: 'absolute', top: 20, left: 20, padding: '10px 20px', backgroundColor: 'transparent', color: 'white', border: '2px solid white', borderRadius: '5px', cursor: 'pointer' }}>← VOLTAR PARA A LOJA</button>
                {currentView === 'login' ? <Login onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => setCurrentView('register')} /> : <Register onLoginSuccess={handleLoginSuccess} onSwitchToLogin={() => setCurrentView('login')} />}
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
            <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />

            {/* MODAL DARK */}
            {itemToBuy && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
                    <div style={{ backgroundColor: '#13223d', padding: '30px', borderRadius: '20px', maxWidth: '450px', width: '90%', textAlign: 'center', border: '1px solid #2a4675', color: 'white' }}>
                        <h2 style={{ fontSize: '32px', marginTop: 0, color: 'white' }}>CONFIRMAR COMPRA</h2>
                        <div style={{ background: RARITY_COLORS[itemToBuy.rarity] || RARITY_COLORS.default, borderRadius: '15px', padding: '20px', margin: '20px auto', width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={itemToBuy.image_url} alt={itemToBuy.name} style={{ width: '140px', height: '140px', objectFit: 'contain', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' }} />
                        </div>
                        <p style={{ fontSize: '24px', margin: '10px 0' }}>{itemToBuy.name}</p>
                        <p style={{ fontSize: '36px', color: '#ffe600', margin: '0 0 30px 0' }}>{itemToBuy.price} <span style={{ fontSize: '20px' }}>V-BUCKS</span></p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button onClick={() => setItemToBuy(null)} style={{ padding: '15px 30px', cursor: 'pointer', backgroundColor: 'transparent', border: '2px solid #666', color: '#ccc', borderRadius: '10px', fontSize: '18px' }}>CANCELAR</button>
                            <button onClick={confirmPurchase} style={{ padding: '15px 40px', cursor: 'pointer', backgroundColor: '#ffe600', color: 'black', border: 'none', borderRadius: '10px', fontSize: '20px', fontWeight: 'bold' }}>COMPRAR AGORA</button>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER MINIMALISTA */}
            <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', backgroundColor: 'rgba(10, 20, 38, 0.8)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid #1e3a5f' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '2px', color: 'white' }}>FORTNITE <span style={{color: '#0078ff'}}>STORE</span></div>
                <div>
                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '14px', color: '#8ba0c6' }}>JOGADOR</div>
                                <div style={{ fontSize: '18px', color: 'white' }}>{user.username}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '14px', color: '#8ba0c6' }}>SALDO V-BUCKS</div>
                                <div style={{ fontSize: '24px', color: '#ffe600' }}>{user.balance.toLocaleString()}</div>
                            </div>
                            <button onClick={handleLogout} style={{ padding: '10px 25px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>SAIR</button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button onClick={() => setCurrentView('login')} style={{ padding: '12px 30px', backgroundColor: 'transparent', color: 'white', border: '2px solid #0078ff', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>ENTRAR</button>
                            <button onClick={() => setCurrentView('register')} style={{ padding: '12px 30px', backgroundColor: '#ffe600', color: 'black', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>CADASTRAR</button>
                        </div>
                    )}
                </div>
            </nav>

            {/* HERO BANNER GIGANTE */}
            <div style={{ textAlign: 'center', padding: '80px 20px', background: 'linear-gradient(180deg, rgba(10,20,38,0) 0%, #0a1426 100%), url(https://cdn2.unrealengine.com/fortnite-battle-royale-chapter-4-season-original-key-art-1920x1080-56858df9e76b.jpg) no-repeat center top / cover' }}>
                <h1 style={{ fontSize: '120px', margin: 0, lineHeight: 1, textShadow: '0 5px 30px rgba(0,120,255,0.5)' }}>FORTNITE COSMETICS</h1>
                <p style={{ fontSize: '24px', color: '#8ba0c6', marginTop: '20px', maxWidth: '600px', marginInline: 'auto' }}>Explore, filtre e adquira seus itens favoritos usando seu saldo de V-Bucks.</p>
            </div>

            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px' }}>
                {/* BARRA DE FILTROS ESTILIZADA */}
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '50px', padding: '25px', backgroundColor: '#13223d', borderRadius: '20px', border: '1px solid #2a4675', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
                    <input type="text" placeholder="🔍 Buscar por nome..." value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} style={{ flex: 2, minWidth: '200px', fontSize: '16px' }} />
                    <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} style={{ flex: 1, minWidth: '150px', fontSize: '16px' }}>
                        <option value="">💎 Todas Raridades</option>
                        <option value="common">Comum (Cinza)</option>
                        <option value="uncommon">Incomum (Verde)</option>
                        <option value="rare">Raro (Azul)</option>
                        <option value="epic">Épico (Roxo)</option>
                        <option value="legendary">Lendário (Laranja)</option>
                        <option value="mythic">Mítico (Dourado)</option>
                        <option value="marvel">Marvel (Vermelho)</option>
                        <option value="dc">DC Series (Azul)</option>
                        <option value="icon">Icon Series (Turquesa)</option>
                        <option value="starwars">Star Wars (Azul Escuro)</option>
                        <option value="gaminglegends">Lendas dos Jogos (Indigo)</option>
                    </select>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ flex: 1, minWidth: '150px', fontSize: '16px' }}>
                        <option value="">🎒 Todos Tipos</option>
                        <option value="outfit">Traje (Skin)</option>
                        <option value="backpack">Mochila</option>
                        <option value="pickaxe">Picareta</option>
                        <option value="emote">Gesto (Dança)</option>
                        <option value="glider">Asa-delta</option>
                        <option value="wrap">Envelopamento</option>
                        <option value="music">Música</option>
                        <option value="loadingloading">Tela de Carregamento</option>
                    </select>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', backgroundColor: '#0a1426', padding: '10px 20px', borderRadius: '10px', border: '1px solid #1e3a5f' }}>
                         <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#8ba0c6', fontWeight: 'bold' }}>
                            <input type="checkbox" checked={forSaleFilter} onChange={(e) => setForSaleFilter(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#ffe600' }} /> Apenas à venda
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#8ba0c6', fontWeight: 'bold' }}>
                            <input type="checkbox" checked={isNewFilter} onChange={(e) => setIsNewFilter(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#ffe600' }} /> Itens Novos
                        </label>
                    </div>
                    <button onClick={handleFilterChange} style={{ padding: '15px 40px', backgroundColor: '#0078ff', color: 'white', border: 'none', borderRadius: '10px', fontSize: '18px', cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,120,255,0.4)', transition: 'transform 0.2s' }} onMouseDown={(e)=>e.target.style.transform='scale(0.95)'} onMouseUp={(e)=>e.target.style.transform='scale(1)'}>FILTRAR ITENS</button>
                </div>

                {/* GRID DE CARDS INSPIRADO NA REFERÊNCIA */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '30px' }}>
                    {cosmetics.map((item) => {
                        const isOwned = purchasedIds.includes(item.id);
                        // Pega a cor baseada na raridade ou usa a padrão
                        const bgColor = RARITY_COLORS[item.rarity?.toLowerCase()] || RARITY_COLORS.default;

                        return (
                            <div key={item.id} style={{ 
                                backgroundColor: bgColor, 
                                borderRadius: '20px', 
                                overflow: 'hidden', 
                                position: 'relative', 
                                boxShadow: `0 25px 50px -12px ${bgColor}66`, // Sombra colorida baseada na raridade
                                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                opacity: isOwned ? 0.6 : 1,
                                filter: isOwned ? 'grayscale(80%)' : 'none',
                                cursor: isOwned ? 'default' : 'pointer'
                            }}
                            onMouseEnter={(e) => { if (!isOwned) { e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)'; }}}
                            onMouseLeave={(e) => { if (!isOwned) { e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}}
                            >
                                {item.is_new && <div style={{ position: 'absolute', top: 15, right: 15, backgroundColor: '#ffe600', color: 'black', padding: '5px 12px', borderRadius: '20px', fontWeight: '900', fontSize: '14px', zIndex: 10, boxShadow: '0 5px 15px rgba(0,0,0,0.2)' }}>NOVO!</div>}
                                {isOwned && <div style={{ position: 'absolute', top: 15, left: 15, backgroundColor: '#22c55e', color: 'white', padding: '5px 12px', borderRadius: '20px', fontWeight: '900', fontSize: '14px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '5px' }}>✓ OBTIDO</div>}
                                
                                {/* Área da Imagem com Gradiente */}
                                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(circle at center, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.1) 100%)`, padding: '20px' }}>
                                    <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.5))', transition: 'transform 0.3s ease' }} />
                                </div>

                                {/* Área de Informações Inferior */}
                                <div style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', padding: '20px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                    <h3 style={{ margin: '0 0 5px 0', fontSize: '24px', color: 'white', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h3>
                                    <p style={{ margin: '0 0 20px 0', color: 'rgba(255,255,255,0.7)', fontSize: '14px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>{item.rarity?.toUpperCase() || 'COMUM'}</p>
                                    
                                    {isOwned ? (
                                        <button disabled style={{ width: '100%', padding: '15px', backgroundColor: 'transparent', border: '2px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.5)', borderRadius: '12px', fontSize: '20px', fontWeight: 'bold', cursor: 'default' }}>JÁ POSSUI</button>
                                    ) : item.price > 0 ? (
                                        <button onClick={() => openBuyModal(item)} style={{ width: '100%', padding: '15px', backgroundColor: '#0078ff', border: 'none', borderRadius: '12px', color: 'white', fontSize: '22px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(0,120,255,0.5)', transition: 'all 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#1a8aff'} onMouseLeave={(e) => e.target.style.backgroundColor = '#0078ff'}>
                                            COMPRAR {item.price}
                                        </button>
                                    ) : (
                                        <button disabled style={{ width: '100%', padding: '15px', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', color: 'rgba(255,255,255,0.4)', fontSize: '20px', fontWeight: 'bold', cursor: 'not-allowed' }}>INDISPONÍVEL</button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Botão Carregar Mais */}
                <div style={{ textAlign: 'center', marginTop: '60px', marginBottom: '100px' }}>
                    {!loading && cosmetics.length > 0 && (
                        <button onClick={loadMore} style={{ padding: '20px 60px', fontSize: '24px', cursor: 'pointer', backgroundColor: 'transparent', color: '#ffe600', border: '3px solid #ffe600', borderRadius: '50px', fontWeight: 'bold', letterSpacing: '2px', transition: 'all 0.3s' }} onMouseEnter={(e) => {e.target.style.backgroundColor = '#ffe600'; e.target.style.color = 'black'}} onMouseLeave={(e) => {e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#ffe600'}}>
                            CARREGAR MAIS ITENS +
                        </button>
                    )}
                    {loading && <p style={{ color: '#8ba0c6', fontSize: '20px' }}>Carregando cosméticos...</p>}
                </div>
            </div>
        </div>
    );
}

export default App;