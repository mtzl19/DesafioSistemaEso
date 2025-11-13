import React, { useEffect, useState } from 'react';
import Login from './Login';
import Register from './Register';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- CORES BASEADAS NA RARIDADE DOS ITENS ---
const RARITY_COLORS = {
    common: '#6c757d',      // Cinza
    uncommon: '#5da81d',    // Verde
    rare: '#2dc0fd',        // Azul Claro
    epic: '#a855f7',        // Roxo
    legendary: '#ea580c',   // Laranja Forte
    mythic: '#eab308',      // Dourado
    marvel: '#ef4444',      // Vermelho (Marvel)
    dc: '#3b82f6',          // Azul (DC)
    icon: '#14b8a6',        // Turquesa (Icon Series)
    gaminglegends: '#6366f1', // Indigo (Lendas dos Jogos)
    starwars: '#2563eb',    // Azul (Star Wars)
    default: '#1e293b'      // Cor padrão
};

function App() {
    // --- ESTADOS PRINCIPAIS ---
    const [user, setUser] = useState(null);
    const [currentView, setCurrentView] = useState('shop');
    const [cosmetics, setCosmetics] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [purchasedIds, setPurchasedIds] = useState([]);
    const [myPurchases, setMyPurchases] = useState([]);

    // --- FILTROS ---
    const [nameFilter, setNameFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [rarityFilter, setRarityFilter] = useState('');
    const [forSaleFilter, setForSaleFilter] = useState(false);
    const [isNewFilter, setIsNewFilter] = useState(false);
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [promotionFilter, setPromotionFilter] = useState(false);

    // --- MODAIS ---
    const [itemToBuy, setItemToBuy] = useState(null);
    const [showRechargeModal, setShowRechargeModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [itemToRefund, setItemToRefund] = useState(null);
    const [showUserDropdown, setShowUserDropdown] = useState(false);


    // --- EFEITOS E FUNÇÕES DE BUSCA ---
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

            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (promotionFilter) params.append('onPromotion', 'true');

            const response = await fetch(`http://localhost:3001/api/cosmetics?${params.toString()}`);
            const data = await response.json();
            if (pageToFetch === 1 || resetList) { setCosmetics(data.data); setPage(1); }
            else { setCosmetics((prev) => [...prev, ...data.data]); }
        } catch (error) { toast.error("Erro ao carregar a loja."); } finally { setLoading(false); }
    };

    // --- HANDLERS DE AÇÃO ---
    const handleFilterChange = () => { setCosmetics([]); fetchCosmetics(1, true); }
    
    // Atualiza a lista sempre que um filtro mudar
    useEffect(() => {
        if (currentView === 'shop') {
            handleFilterChange();
        }
    }, [sortBy, sortOrder, nameFilter, typeFilter, rarityFilter, forSaleFilter, isNewFilter, startDate, endDate, promotionFilter]);

    // Função que Limpa todos os filtros
    const handleClearFilters = () => {
        setNameFilter('');
        setTypeFilter('');
        setRarityFilter('');
        setForSaleFilter(false);
        setIsNewFilter(false);
        setStartDate('');
        setEndDate('');
        setPromotionFilter(false);
        // O handleFilterChange() será chamado automaticamente pelo useEffect
    };

    const loadMore = () => { const nextPage = page + 1; setPage(nextPage); fetchCosmetics(nextPage); };

    const handleLoginSuccess = (userData) => {
        setUser(userData); setCurrentView('shop'); toast.success(`Bem-vindo, ${userData.username}!`);
        fetchPurchasedItems(localStorage.getItem('token'));
    };

    const handleLogout = () => {
        localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); setPurchasedIds([]);
        setCurrentView('shop');
        setShowUserDropdown(false);
        toast.info("Logout realizado.");
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
            
            const updatedUser = { ...user, balance: data.newBalance };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            setPurchasedIds([...purchasedIds, itemToBuy.id]);
        } catch (error) { toast.error(error.message); } finally { setItemToBuy(null); }
    };

    const showMyPurchases = async () => {
        if (!user) {
            toast.warning("Você precisa estar logado para ver sua coleção.");
            setCurrentView('login');
            return;
        }
        setLoading(true);
        setCurrentView('my_purchases');
        setShowUserDropdown(false);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3001/api/user/my-items', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Não foi possível carregar seus itens.");
            setMyPurchases(data);
        } catch (err) {
            toast.error(err.message);
            setCurrentView('shop');
        } finally {
            setLoading(false);
        }
    };

    const handleRecharge = async (amount) => {
        if (!user) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3001/api/user/recharge', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao recarregar');
            const updatedUser = { ...user, balance: data.newBalance };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            toast.success(`🎉 ${amount.toLocaleString()} V-Bucks adicionados com sucesso!`);
            setShowRechargeModal(false);
        } catch (error) {
            toast.error(`Erro na recarga: ${error.message}`);
        }
    };

    const handleRefund = async () => {
        if (!itemToRefund || !user) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:3001/api/user/refund/${itemToRefund.id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const responseText = await response.text();
            if (!response.ok) {
                try {
                    const errorData = JSON.parse(responseText);
                    throw new Error(errorData.error || 'Erro ao devolver');
                } catch (e) {
                    throw new Error(responseText.substring(0, 100) || 'Erro no servidor');
                }
            }

            if (!responseText) {
                throw new Error('Servidor não retornou dados da devolução.');
            }

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Resposta inesperada do servidor:', responseText);
                throw new Error('Servidor enviou resposta em formato incorreto.');
            }

            toast.success(`"${itemToRefund.name}" devolvido. Você recebeu ${data.refundAmount} V-Bucks.`);
            const updatedUser = { ...user, balance: data.newBalance };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setPurchasedIds(prev => prev.filter(id => id !== itemToRefund.id));
            setMyPurchases(prev => prev.filter(item => item.id !== itemToRefund.id));

        } catch (error) {
            toast.error(error.message);
        } finally {
            setItemToRefund(null);
        }
    };


    // --- RENDERIZAÇÃO DAS TELAS DE LOGIN/REGISTRO ---
    if (currentView === 'login' || currentView === 'register') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)' }}>
                <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />
                <button onClick={() => setCurrentView('shop')} style={{ position: 'absolute', top: 20, left: 20, padding: '10px 20px', backgroundColor: 'transparent', color: 'white', border: '2px solid white', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' }}>← VOLTAR PARA A LOJA</button>
                {currentView === 'login' 
                    ? <Login onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => setCurrentView('register')} /> 
                    : <Register onLoginSuccess={handleLoginSuccess} onSwitchToLogin={() => setCurrentView('login')} />}
            </div>
        );
    }

    // --- RENDERIZAÇÃO PRINCIPAL (LOJA OU MINHA COLEÇÃO) ---
    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
            <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />

            {/* --- MODAL DE CONFIRMAÇÃO DE COMPRA --- */}
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

            {/* --- MODAL DE RECARGA DE V-BUCKS --- */}
            {showRechargeModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
                    <div style={{ backgroundColor: '#13223d', padding: '30px', borderRadius: '20px', maxWidth: '700px', width: '90%', textAlign: 'center', border: '1px solid #2a4675', color: 'white', position: 'relative' }}>
                        <button onClick={() => setShowRechargeModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: '2px solid #666', color: '#ccc', borderRadius: '50%', width: '30px', height: '30px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>X</button>
                        <h2 style={{ fontSize: '32px', marginTop: 0, color: 'white' }}>RECARREGAR V-BUCKS</h2>
                        <p style={{ color: '#8ba0c6', marginTop: '-10px', marginBottom: '30px' }}>Esta é uma simulação. A recarga será salva no banco.</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div style={{ backgroundColor: '#0a1426', border: '1px solid #2a4675', padding: '20px', borderRadius: '15px' }}>
                                <h3 style={{ fontSize: '24px', color: '#ffe600', margin: 0 }}>1.000</h3>
                                <p style={{ margin: '5px 0 15px 0', color: '#8ba0c6', fontSize: '14px' }}>V-BUCKS</p>
                                <button onClick={() => handleRecharge(1000)} style={{ padding: '10px 20px', backgroundColor: '#ffe600', color: 'black', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>COMPRAR</button>
                            </div>
                            <div style={{ backgroundColor: '#0a1426', border: '1px solid #2a4675', padding: '20px', borderRadius: '15px' }}>
                                <h3 style={{ fontSize: '24px', color: '#ffe600', margin: 0 }}>2.800</h3>
                                <p style={{ margin: '5px 0 15px 0', color: '#8ba0c6', fontSize: '14px' }}>V-BUCKS</p>
                                <button onClick={() => handleRecharge(2800)} style={{ padding: '10px 20px', backgroundColor: '#ffe600', color: 'black', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>COMPRAR</button>
                            </div>
                            <div style={{ backgroundColor: '#0a1426', border: '1px solid #2a4675', padding: '20px', borderRadius: '15px' }}>
                                <h3 style={{ fontSize: '24px', color: '#ffe600', margin: 0 }}>5.000</h3>
                                <p style={{ margin: '5px 0 15px 0', color: '#8ba0c6', fontSize: '14px' }}>V-BUCKS</p>
                                <button onClick={() => handleRecharge(5000)} style={{ padding: '10px 20px', backgroundColor: '#ffe600', color: 'black', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>COMPRAR</button>
                            </div>
                            <div style={{ backgroundColor: '#0a1426', border: '1px solid #2a4675', padding: '20px', borderRadius: '15px' }}>
                                <h3 style={{ fontSize: '24px', color: '#ffe600', margin: 0 }}>13.500</h3>
                                <p style={{ margin: '5px 0 15px 0', color: '#8ba0c6', fontSize: '14px' }}>V-BUCKS</p>
                                <button onClick={() => handleRecharge(13500)} style={{ padding: '10px 20px', backgroundColor: '#ffe600', color: 'black', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>COMPRAR</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL DE DEVOLUÇÃO --- */}
            {itemToRefund && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, backdropFilter: 'blur(5px)' }}>
                    <div style={{ backgroundColor: '#13223d', padding: '30px', borderRadius: '20px', maxWidth: '450px', width: '90%', textAlign: 'center', border: '1px solid #2a4675', color: 'white' }}>
                        <h2 style={{ fontSize: '32px', marginTop: 0, color: '#ef4444' }}>DEVOLVER ITEM</h2>
                        <div style={{ background: RARITY_COLORS[itemToRefund.rarity] || RARITY_COLORS.default, borderRadius: '15px', padding: '20px', margin: '20px auto', width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={itemToRefund.image_url} alt={itemToRefund.name} style={{ width: '140px', height: '140px', objectFit: 'contain' }} />
                        </div>
                        <p style={{ fontSize: '24px', margin: '10px 0' }}>{itemToRefund.name}</p>
                        <p style={{ fontSize: '18px', color: '#8ba0c6', margin: '0 0 30px 0' }}>
                            Tem certeza que deseja devolver este item? O valor pago será creditado na sua conta.
                        </p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button onClick={() => setItemToRefund(null)} style={{ padding: '15px 30px', cursor: 'pointer', backgroundColor: 'transparent', border: '2px solid #666', color: '#ccc', borderRadius: '10px', fontSize: '18px' }}>CANCELAR</button>
                            <button onClick={handleRefund} style={{ padding: '15px 40px', cursor: 'pointer', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', fontSize: '20px', fontWeight: 'bold' }}>DEVOLVER</button>
                        </div>
                    </div>
                </div>
            )}


            {/* --- MODAL DE DETALHES DO ITEM --- */}
            {selectedItem && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, backdropFilter: 'blur(5px)' }} onClick={() => setSelectedItem(null)}>
                    <div style={{ backgroundColor: '#13223d', padding: '30px', borderRadius: '20px', maxWidth: '600px', width: '90%', border: '1px solid #2a4675', color: 'white', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelectedItem(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: '2px solid #666', color: '#ccc', borderRadius: '50%', width: '30px', height: '30px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>X</button>
                        <h2 style={{ fontSize: '32px', marginTop: 0, color: 'white' }}>{selectedItem.name}</h2>
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                            
                            {/* CAIXA DA IMAGEM */}
                            <div style={{ 
                                background: RARITY_COLORS[selectedItem.rarity] || RARITY_COLORS.default, 
                                borderRadius: '15px', 
                                padding: '20px', 
                                width: '250px', // Largura fixa
                                flexShrink: 0     // Impede que a imagem seja espremida
                            }}>
                                <img src={selectedItem.image_url} alt={selectedItem.name} style={{ width: '100%', objectFit: 'contain' }} />
                            </div>
                            
                            {/* CAIXA DE TEXTO */}
                            <div style={{ 
                                flex: 1, // Ocupa o espaço restante
                                display: 'flex', 
                                flexDirection: 'column', 
                                height: '100%',
                                minWidth: 0 // Permite que o flex item diminua e quebre linhas
                            }}>
                                <p style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#8ba0c6' }}>{selectedItem.description || "Sem descrição."}</p>
                                <p style={{ margin: '0 0 5px 0' }}><strong>Raridade:</strong> {selectedItem.rarity}</p>
                                <p style={{ margin: '0 0 5px 0' }}><strong>Tipo:</strong> {selectedItem.type}</p>
                                <p style={{ margin: '0 0 5px 0' }}><strong>Set:</strong> {selectedItem.set_text || "N/A"}</p>
                                <p style={{ margin: '0 0 5px 0' }}><strong>Introdução:</strong> {selectedItem.introduction_text || "N/A"}</p>
                                <p style={{ margin: '0 0 20px 0' }}><strong>Data Adic.:</strong> {new Date(selectedItem.added_at).toLocaleDateString('pt-BR')}</p>

                                {/* Botão de Compra no Modal */}
                                {!purchasedIds.includes(selectedItem.id) && selectedItem.price > 0 && (
                                    <button 
                                        onClick={() => {
                                            setSelectedItem(null);
                                            openBuyModal(selectedItem);
                                        }}
                                        style={{ 
                                            width: '100%', padding: '15px', backgroundColor: '#0078ff', border: 'none', 
                                            borderRadius: '12px', color: 'white', fontSize: '22px', 
                                            cursor: 'pointer', marginTop: 'auto'
                                        }}
                                    >
                                        COMPRAR {selectedItem.price}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- HEADER --- */}
            <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', backgroundColor: 'rgba(10, 20, 38, 0.8)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid #1e3a5f' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '2px', color: 'white' }}>V<span style={{color: '#0078ff'}}>SHOP</span></div>
                    {currentView === 'my_purchases' && (
                        <button onClick={() => setCurrentView('shop')} style={{ padding: '10px 20px', backgroundColor: 'transparent', color: '#ffe600', border: '2px solid #ffe600', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>← VOLTAR À LOJA</button>
                    )}
                </div>
                <div>
                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '25px' }}>
                            <div style={{ textAlign: 'right', position: 'relative' }}>
                                <div onClick={() => setShowUserDropdown(!showUserDropdown)} style={{ cursor: 'pointer' }}>
                                    <div style={{ fontSize: '14px', color: '#8ba0c6', textTransform: 'uppercase' }}>Jogador</div>
                                    <div style={{ fontSize: '18px', color: 'white' }}>{user.username} ▼</div>
                                </div>
                                {showUserDropdown && (
                                    <div style={{
                                        position: 'absolute', top: '55px', right: 0,
                                        backgroundColor: '#13223d', border: '1px solid #2a4675',
                                        borderRadius: '10px', overflow: 'hidden', zIndex: 101,
                                        width: '220px', textAlign: 'left'
                                    }}>
                                        <div onClick={showMyPurchases} style={{ padding: '15px 20px', color: 'white', cursor: 'pointer', borderBottom: '1px solid #2a4675' }}>Minha Coleção</div>
                                        <div onClick={() => toast.info('Função "Alterar Dados" não implementada.')} style={{ padding: '15px 20px', color: '#666', cursor: 'not-allowed', borderBottom: '1px solid #2a4675' }}>Alterar Dados</div>
                                        <div onClick={handleLogout} style={{ padding: '15px 20px', color: '#ef4444', cursor: 'pointer' }}>Sair</div>
                                    </div>
                                )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '14px', color: '#8ba0c6', textTransform: 'uppercase' }}>Saldo V-Bucks</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ fontSize: '24px', color: '#ffe600', lineHeight: 1 }}>{user.balance.toLocaleString()}</div>
                                    <button
                                        onClick={() => setShowRechargeModal(true)}
                                        title="Recarregar V-Bucks"
                                        style={{
                                            backgroundColor: '#ffe600', border: 'none', borderRadius: '50%',
                                            width: '28px', height: '28px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button onClick={() => setCurrentView('login')} style={{ padding: '12px 30px', backgroundColor: 'transparent', color: 'white', border: '2px solid #0078ff', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>ENTRAR</button>
                            <button onClick={() => setCurrentView('register')} style={{ padding: '12px 30px', backgroundColor: '#ffe600', color: 'black', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>CADASTRAR</button>
                        </div>
                    )}
                </div>
            </nav>

            {/* --- Banner da loja --- */}
            {currentView === 'shop' && (
                <div style={{ textAlign: 'center', padding: '80px 20px', background: 'linear-gradient(180deg, rgba(10,20,38,0) 0%, #0a1426 100%), url(https://cdn2.unrealengine.com/fortnite-battle-royale-chapter-4-season-original-key-art-1920x1080-56858df9e76b.jpg) no-repeat center top / cover' }}>
                    <h1 style={{ fontSize: '120px', margin: 0, lineHeight: 1, textShadow: '0 5px 30px rgba(0,120,255,0.5)' }}>FORTNITE COSMETICS</h1>
                    <p style={{ fontSize: '24px', color: '#8ba0c6', marginTop: '20px', maxWidth: '600px', marginInline: 'auto' }}>Explore, filtre e adquira seus itens favoritos usando seu saldo de V-Bucks.</p>
                </div>
            )}

            {/* --- CONTEÚDO PRINCIPAL --- */}
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px' }}>
                
                {/* --- FILTROS --- */}
                {currentView === 'shop' && (
                    <div style={{ 
                        display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center', 
                        marginBottom: '50px', padding: '25px', backgroundColor: '#13223d', 
                        borderRadius: '20px', border: '1px solid #2a4675', 
                        boxShadow: '0 20px 50px rgba(0,0,0,0.3)' 
                    }}>
                        <input type="text" placeholder="🔍 Buscar por nome..." value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} style={{ flex: 2, minWidth: '200px', fontSize: '16px' }} />
                        <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} style={{ flex: 1, minWidth: '150px', fontSize: '16px' }}>
                            <option value="">💎 Todas Raridades</option>
                            <option value="common">Comum</option>
                            <option value="uncommon">Incomum</option>
                            <option value="rare">Raro</option>
                            <option value="epic">Épico</option>
                            <option value="legendary">Lendário</option>
                            <option value="marvel">Marvel</option>
                            <option value="dc">DC</option>
                            <option value="icon">Ícone</option>
                            <option value="gaminglegends">Lendas dos Jogos</option>
                            <option value="starwars">Star Wars</option>
                        </select>
                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ flex: 1, minWidth: '150px', fontSize: '16px' }}>
                            <option value="">🎒 Todo Tipo</option>
                            <option value="outfit">Traje</option>
                            <option value="backpack">Mochila</option>
                            <option value="pickaxe">Picareta</option>
                            <option value="emote">Gesto</option>
                        </select>
                        
                        {/* FILTRO DE DATA (REQ. 2) */}
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <span style={{fontSize: '14px', fontWeight: 'bold', color: '#8ba0c6'}}>De:</span>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ fontSize: '16px', padding: '8px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <span style={{fontSize: '14px', fontWeight: 'bold', color: '#8ba0c6'}}>Até:</span>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ fontSize: '16px', padding: '8px' }} />
                        </div>

                        {/* CHECKBOXES (REQ. 3) */}
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', backgroundColor: '#0a1426', padding: '10px 20px', borderRadius: '10px', border: '1px solid #1e3a5f', marginLeft: 'auto' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#8ba0c6', fontWeight: 'bold' }}>
                                <input type="checkbox" checked={forSaleFilter} onChange={(e) => setForSaleFilter(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#ffe600' }} /> Apenas à venda
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#8ba0c6', fontWeight: 'bold' }}>
                                <input type="checkbox" checked={isNewFilter} onChange={(e) => setIsNewFilter(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#ffe600' }} /> Itens Novos
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#8ba0c6', fontWeight: 'bold' }}>
                                <input type="checkbox" checked={promotionFilter} onChange={(e) => setPromotionFilter(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#ffe600' }} /> Em Promoção
                            </label>
                        </div>
                        
                        {/* BOTÃO LIMPAR (REQ. 1) */}
                        <button onClick={handleClearFilters} style={{padding: '10px 20px', fontSize: '16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'}}>
                            Limpar Filtros
                        </button>
                    </div>
                )}

                {/* --- GRID DA LOJA --- */}
                {currentView === 'shop' && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '30px' }}>
                            {cosmetics.map((item) => {
                                const isOwned = purchasedIds.includes(item.id);
                                const bgColor = RARITY_COLORS[item.rarity?.toLowerCase()] || RARITY_COLORS.default;
                                return (
                                    <div key={item.id} style={{ 
                                        backgroundColor: bgColor, borderRadius: '20px', overflow: 'hidden', position: 'relative', 
                                        boxShadow: `0 25px 50px -12px ${bgColor}66`, transition: 'transform 0.3s ease', 
                                        opacity: isOwned ? 0.6 : 1, filter: isOwned ? 'grayscale(80%)' : 'none',
                                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                                        cursor: 'pointer'
                                    }}
                                        onMouseEnter={(e) => { if (!isOwned) e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)'; }}
                                        onMouseLeave={(e) => { if (!isOwned) e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
                                        onClick={() => setSelectedItem(item)}
                                    >
                                        {/* Banners dos cards */}
                                        {/* Banners Canto Esquerdo: OBTIDO ou À VENDA! */}
                                        {isOwned ? (
                                            <div style={{ 
                                                position: 'absolute', top: 15, left: 15, 
                                                backgroundColor: '#22c55e', color: 'white', 
                                                padding: '5px 12px', borderRadius: '20px', 
                                                fontWeight: '900', fontSize: '14px', zIndex: 10 
                                            }}>✓ OBTIDO</div>
                                        ) : item.is_for_sale && (
                                            <div style={{ 
                                                position: 'absolute', top: 15, left: 15, 
                                                backgroundColor: '#0078ff', color: 'white', 
                                                padding: '5px 12px', borderRadius: '20px', 
                                                fontWeight: '900', fontSize: '14px', zIndex: 10 
                                            }}>À VENDA!</div>
                                        )}

                                        {/* Banners Canto Direito: NOVO! e PROMOÇÃO! */}
                                        {item.is_new && (
                                            <div style={{ 
                                                position: 'absolute', top: 15, right: 15, 
                                                backgroundColor: '#ffe600', color: 'black', 
                                                padding: '5px 12px', borderRadius: '20px', 
                                                fontWeight: '900', fontSize: '14px', zIndex: 10 
                                            }}>NOVO!</div>
                                        )}
                                        {item.on_promotion && !isOwned && (
                                            <div style={{ 
                                                position: 'absolute', 
                                                top: item.is_new ? 55 : 15, // Posição dinâmica
                                                right: 15, 
                                                backgroundColor: '#ef4444', color: 'white', 
                                                padding: '5px 12px', borderRadius: '20px', 
                                                fontWeight: '900', fontSize: '14px', zIndex: 10 
                                            }}>PROMOÇÃO!</div>
                                        )}

                                        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.1) 100%)` }}>
                                            <img src={item.image_url} alt={item.name} style={{ width: '90%', height: '90%', objectFit: 'contain', filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.5))' }} />
                                        </div>
                                        
                                        <div style={{ 
                                            backgroundColor: 'rgba(0,0,0,0.6)', 
                                            backdropFilter: 'blur(10px)', 
                                            padding: '20px', 
                                            textAlign: 'center', 
                                            borderTop: '1px solid rgba(255,255,255,0.1)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            flexGrow: 1,
                                            justifyContent: 'space-between'
                                        }}>
                                            <div>
                                                <h3 style={{ margin: '0 0 5px 0', fontSize: '24px', color: 'white' }}>{item.name}</h3>
                                                <p style={{ margin: '0 0 20px 0', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 'bold' }}>{item.rarity?.toUpperCase() || 'COMUM'}</p>
                                            </div>
                                            
                                            {isOwned ? (
                                                <button disabled style={{ width: '100%', padding: '15px', backgroundColor: 'transparent', border: '2px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.5)', borderRadius: '12px', fontSize: '20px' }}>JÁ POSSUI</button>
                                            ) : item.price > 0 ? (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openBuyModal(item);
                                                    }}
                                                    style={{ 
                                                        width: '100%', 
                                                        padding: '15px', 
                                                        // Muda a cor do botão se estiver em promoção
                                                        backgroundColor: item.on_promotion ? '#ffe600' : '#0078ff', 
                                                        border: 'none', 
                                                        borderRadius: '12px', 
                                                        // Muda a cor do texto se estiver em promoção
                                                        color: item.on_promotion ? 'black' : 'white', 
                                                        fontSize: '22px', 
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer',
                                                        // Adiciona altura mínima para o botão não "pular"
                                                        minHeight: '65px', 
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        lineHeight: '1.2'
                                                    }}
                                                >
                                                    {/* Renderização Condicional do Preço */}
                                                    {item.on_promotion ? (
                                                        <>
                                                            <span style={{ fontSize: '16px', textDecoration: 'line-through', opacity: 0.7 }}>
                                                                DE {item.regular_price}
                                                            </span>
                                                            <span>POR {item.price}</span>
                                                        </>
                                                    ) : (
                                                        <span>COMPRAR {item.price}</span>
                                                    )}
                                                </button>
                                            ) : (
                                                <button disabled style={{ width: '100%', padding: '15px', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', color: 'rgba(255,255,255,0.4)' }}>INDISPONÍVEL</button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '60px', marginBottom: '100px' }}>
                            {!loading && cosmetics.length > 0 && <button onClick={loadMore} style={{ padding: '20px 60px', fontSize: '24px', cursor: 'pointer', backgroundColor: 'transparent', color: '#ffe600', border: '3px solid #ffe600', borderRadius: '50px' }}>CARREGAR MAIS +</button>}
                            {loading && <p style={{ color: '#8ba0c6', fontSize: '20px' }}>Carregando...</p>}
                        </div>
                    </>
                )}

                {/* --- GRID "MINHA COLEÇÃO" --- */}
                {currentView === 'my_purchases' && (
                    <div>
                        <h1 style={{ fontSize: '72px', textAlign: 'center', color: '#ffe600', marginBottom: '50px' }}>Minha Coleção</h1>
                        {loading && <p style={{ color: '#8ba0c6', fontSize: '20px', textAlign: 'center' }}>Carregando sua coleção...</p>}
                        {!loading && myPurchases.length === 0 && (
                            <p style={{ color: '#8ba0c6', fontSize: '24px', textAlign: 'center' }}>Sua coleção está vazia. Volte à loja para adquirir itens!</p>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '30px' }}>
                            {myPurchases.map((item) => {
                                const bgColor = RARITY_COLORS[item.rarity?.toLowerCase()] || RARITY_COLORS.default;
                                return (
                                    <div key={item.id} style={{ 
                                        backgroundColor: bgColor, borderRadius: '20px', overflow: 'hidden', 
                                        position: 'relative', boxShadow: `0 25px 50px -12px ${bgColor}66`,
                                        display: 'flex', flexDirection: 'column'
                                    }}>
                                        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.1) 100%)` }}>
                                            <img src={item.image_url} alt={item.name} style={{ width: '90%', height: '90%', objectFit: 'contain', filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.5))' }} />
                                        </div>
                                        <div style={{ 
                                            backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', 
                                            padding: '20px', textAlign: 'center', 
                                            borderTop: '1px solid rgba(255,255,255,0.1)',
                                            flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                                        }}>
                                            <div>
                                                <h3 style={{ margin: '0 0 5px 0', fontSize: '24px', color: 'white' }}>{item.name}</h3>
                                                <p style={{ margin: '0 0 20px 0', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 'bold' }}>{item.rarity?.toUpperCase() || 'COMUM'}</p>
                                            </div>
                                            
                                            <button 
                                                onClick={() => setItemToRefund(item)}
                                                style={{ 
                                                    width: '100%', padding: '15px', backgroundColor: '#ef4444', border: 'none', 
                                                    borderRadius: '12px', color: 'white', fontSize: '20px', 
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                DEVOLVER
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;