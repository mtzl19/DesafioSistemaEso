import React, { useEffect, useState, useRef} from 'react';
import Login from './Login';
import Register from './Register';
import EditProfile from './EditProfile';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- Constantes de Estilo ---
const RARITY_COLORS = {
    common: '#6c757d',
    uncommon: '#5da81d',
    rare: '#2dc0fd',
    epic: '#a855f7',
    legendary: '#ea580c',
    mythic: '#eab308',
    marvel: '#ef4444',
    dc: '#3b82f6',
    icon: '#14b8a6',
    gaminglegends: '#6366f1',
    starwars: '#2563eb',
    default: '#1e293b'
};

const ITEM_TYPE_NAMES = {
    outfit: 'Traje',
    backpack: 'Mochila',
    pickaxe: 'Picareta',
    emote: 'Gesto',
    wrap: 'Envelopamento',
    glider: 'Asa-delta',
    loadingscreen: 'Tela de Carregamento'
};

// Função para ler a view inicial antes da renderização
const getInitialView = () => {
    const savedView = sessionStorage.getItem('currentView');
    if (!savedView) {
        return 'shop';
    }
    
    // Auth Guard: Verifica se a view salva é privada
    const isPrivate = savedView === 'my_purchases' || savedView === 'edit_profile';
    const token = localStorage.getItem('token');
    
    if (isPrivate && !token) {
        sessionStorage.setItem('currentView', 'shop'); // Limpa o state inválido
        return 'shop';
    }
    return savedView;
};

function App() {
    // --- ESTADOS PRINCIPAIS ---
    const [user, setUser] = useState(null);
    const [currentView, setCurrentView] = useState(getInitialView);
    const [isRestoring, setIsRestoring] = useState(true);
    const [cosmetics, setCosmetics] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [purchasedIds, setPurchasedIds] = useState(new Set());
    const [myPurchases, setMyPurchases] = useState([]);
    const [history, setHistory] = useState([]);
    const [rankingPodium, setRankingPodium] = useState([]);
    const [publicUsers, setPublicUsers] = useState({ list: [], totalPages: 0 });
    const [publicUsersPage, setPublicUsersPage] = useState(1);
    const [profileData, setProfileData] = useState({ user: null, items: [] });
    const [profileLoading, setProfileLoading] = useState(false);

    // --- FILTROS ---
    const initialFilters = {
        name: '', type: '', rarity: '',
        forSale: false, isNew: false, onPromotion: false,
        isBundle: false, owned: false,
        sort: 'name', order: 'asc',
        startDate: '', endDate: ''
    };
    const [filters, setFilters] = useState(initialFilters);

    // --- MODAIS ---
    const [itemToBuy, setItemToBuy] = useState(null);
    const [showRechargeModal, setShowRechargeModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [itemToRefund, setItemToRefund] = useState(null);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [bundleModalItems, setBundleModalItems] = useState([]);
    const [bundleModalLoading, setBundleModalLoading] = useState(false);
    const dropdownRef = useRef(null);

    // --- FUNÇÕES DE BUSCA DE DADOS (Fetch) ---
    const fetchCosmetics = async (pageToFetch, resetList = false) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', pageToFetch);
            if (filters.name.trim()) params.append('name', filters.name);
            if (filters.type.trim()) params.append('type', filters.type);
            if (filters.rarity.trim()) params.append('rarity', filters.rarity);
            if (filters.forSale) params.append('forSale', 'true');
            if (filters.isNew) params.append('isnew', 'true');
            params.append('sort', filters.sort);
            params.append('order', filters.order);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.onPromotion) params.append('onPromotion', 'true');
            if (filters.isBundle) params.append('isBundle', 'true');
            if (filters.owned) params.append('owned', 'true');

            const token = localStorage.getItem('token');
            const fetchOptions = { headers: {} };
            if (token) {
                fetchOptions.headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`http://localhost:3001/api/cosmetics?${params.toString()}`, fetchOptions);
            const data = await response.json();
            if (pageToFetch === 1 || resetList) {
                setCosmetics(data.data);
                setPage(1);
            } else {
                setCosmetics((prev) => [...prev, ...data.data]);
            }
        } catch (error) {
            toast.error("Erro ao carregar a loja.");
        } finally {
            setLoading(false);
        }
    };

    const fetchMyPurchasesData = async (token) => {
        if (!token) return;
        try {
            const response = await fetch('http://localhost:3001/api/user/my-items', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setMyPurchases(data);
                setPurchasedIds(new Set(data.map(item => item.id)));
            }
        } catch (error) { console.error('Erro ao carregar dados de compras:', error); }
    };

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const historyResponse = await fetch('http://localhost:3001/api/user/history', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const historyData = await historyResponse.json();
            if (historyResponse.ok) {
                setHistory(historyData);
            }
        } catch (err) {
            toast.error("Erro ao atualizar o histórico.");
        }
    };

    const fetchCommunityData = async (pageToFetch) => {
        setLoading(true);
        try {
            if (pageToFetch === 1) {
                const rankingResponse = await fetch('http://localhost:3001/api/user/users/ranking');
                if (rankingResponse.ok) setRankingPodium(await rankingResponse.json());
            }
            const usersResponse = await fetch(`http://localhost:3001/api/user/users?page=${pageToFetch}`);
            if (usersResponse.ok) {
                const data = await usersResponse.json();
                setPublicUsers({ list: data.users, totalPages: data.totalPages });
                setPublicUsersPage(pageToFetch);
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar dados da comunidade.');
        } finally {
            setLoading(false);
        }
    };

    // --- EFEITOS (useEffect) ---
    
    // Efeito principal: Executado uma única vez para restaurar a sessão do usuário e carregar os dados da view inicial.
    useEffect(() => {
        const restoreSession = async () => {
            const storedUser = localStorage.getItem('user');
            const storedToken = localStorage.getItem('token');
            
            // Passo 1: Se houver um usuário salvo no localStorage, restaura o estado do usuário
            // e busca os itens que ele já possui. Isso é crucial para a UI (ex: marcar itens como "OBTIDO").
            if (storedUser && storedToken) {
                setUser(JSON.parse(storedUser));
                await fetchMyPurchasesData(storedToken);
            }

            // Passo 2: Com base na 'currentView' (obtida da sessionStorage), busca os dados específicos daquela tela.
            // Isso garante que, ao recarregar a página, o usuário continue de onde parou.
            try {
                if (currentView === 'community') {
                    await fetchCommunityData(1);
                } else if (currentView === 'my_purchases' && storedToken) {
                    // Itens já foram carregados (no passo 1), carrega o histórico
                    await fetchHistory();
                } else if (currentView === 'user_profile') {
                    const savedProfileData = sessionStorage.getItem('profileData');
                    if (savedProfileData) {
                        setProfileData(JSON.parse(savedProfileData));
                    } else {
                        setCurrentView('community');
                        await fetchCommunityData(1);
                    }
                } else if (currentView === 'shop') {
                    await fetchCosmetics(1);
                }
            
            } catch (error) {
                toast.error("Erro ao carregar dados da página. Voltando para a loja.");
                // Em caso de erro, redireciona para a loja como uma fallback segura.
                setCurrentView('shop');
                if (cosmetics.length === 0) await fetchCosmetics(1); // Garante que a loja não fique vazia.
            } finally {
                // Passo 3: Finaliza o estado de "restauração", liberando a renderização da UI principal.
                setIsRestoring(false);
            }
        };

        restoreSession();
    }, []);

    // Efeito de persistência: Salva a view atual na sessionStorage sempre que ela muda.
    // Isso permite que a aplicação "lembre" a última página visitada ao ser recarregada.
    useEffect(() => {
        if (currentView !== 'login' && currentView !== 'register') {
            sessionStorage.setItem('currentView', currentView);
        }
    }, [currentView]);

    // Efeito de persistência: Salva os dados de um perfil visitado para evitar novo fetch ao recarregar a página.
    useEffect(() => {
        if (currentView === 'user_profile' && profileData.user) {
            sessionStorage.setItem('profileData', JSON.stringify(profileData));
        }
    }, [profileData, currentView]);

    // Efeito de UX: Permite fechar todos os modais e dropdowns pressionando a tecla 'Escape'.
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setItemToBuy(null);
                setSelectedItem(null);
                setItemToRefund(null);
                setShowRechargeModal(false);
                setShowUserDropdown(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Efeito de UX: Fecha o dropdown do menu de usuário automaticamente ao abrir qualquer modal.
    useEffect(() => {
        if (itemToBuy || selectedItem || itemToRefund || showRechargeModal) {
            setShowUserDropdown(false);
        }
    }, [itemToBuy, selectedItem, itemToRefund, showRechargeModal]);

    // Efeito de UX: Fecha o dropdown do menu de usuário ao clicar fora dele.
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowUserDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    // Efeito de dados: Busca os detalhes de um bundle quando um item de bundle é selecionado em qualquer modal.
    useEffect(() => {
        const activeItem = itemToBuy || selectedItem || itemToRefund;
        if (activeItem && activeItem.bundle_id) {
            fetchBundleDetails(activeItem.bundle_id, activeItem.id);
        } else {
            setBundleModalItems([]);
            setBundleModalLoading(false);
        }  
    }, [itemToBuy, selectedItem, itemToRefund]);

    // Efeito de re-fetch: Dispara uma nova busca na API da loja sempre que qualquer um dos filtros é alterado.
    // A condição `!isRestoring` evita que a busca seja disparada durante a inicialização da aplicação.
    useEffect(() => {
        if (!isRestoring && currentView === 'shop') {
            handleFilterChange();
        }
    }, [filters, isRestoring]);


    // --- FUNÇÕES DE HANDLER ---
    // Navegação
    const showUserProfile = async (username) => {
        setProfileLoading(true);
        setCurrentView('user_profile');
        setHistory([]);

        try {
            const response = await fetch(`http://localhost:3001/api/user/users/profile/${username}`);
            if (response.ok) {
                setProfileData(await response.json());
            } else {
                toast.error('Não foi possível carregar o perfil.');
                setCurrentView('shop');
            }
        } catch (error) {
            toast.error('Erro de rede.');
        } finally {
            setProfileLoading(false);
        }
    };

    const showCommunityPage = () => {
        setCurrentView('community');
        setHistory([]);
        fetchCommunityData(1);
    };

    const showShop = () => {
        setCurrentView('shop');
        setHistory([]); 
        fetchCosmetics(1, true);
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
        
        await fetchHistory();
        setLoading(false);
    };

    const showEditProfile = () => {
        setCurrentView('edit_profile');
        setShowUserDropdown(false);
    };

    // Bundles
    const fetchBundleDetails = async (bundleId, currentItemId) => {
        if (!bundleId) {
            setBundleModalItems([]);
            return;
        }
        
        setBundleModalLoading(true);
        try {
            const encodedBundleId = encodeURIComponent(bundleId);
            const response = await fetch(`http://localhost:3001/api/cosmetics/bundle/${encodedBundleId}`);
            if (response.ok) {
                const bundleResponse = await response.json();
                const itemsArray = bundleResponse.data;

                if (Array.isArray(itemsArray)) {
                    setBundleModalItems(itemsArray.filter(item => item.id !== currentItemId));
                } else {
                    console.error("Erro: A API de bundle não retornou um objeto { data: [...] }.", bundleResponse);
                    setBundleModalItems([]); 
                }

            } else {
                console.error("Erro na requisição ao bundle:", response.status, response.statusText);
                setBundleModalItems([]);
            }
        } catch (error) {
            console.error("Erro ao carregar itens do bundle:", error);
        } finally {
            setBundleModalLoading(false);
        }
    };

    // Filtros e Paginação
    const handleFilterChange = () => { setCosmetics([]); fetchCosmetics(1, true); }

    const handleClearFilters = () => {
        setFilters(initialFilters);
    };

    // Função auxiliar para atualizar o estado dos filtros de forma imutável
    const handleFilterValueChange = (filterName, value) => setFilters(prev => ({ ...prev, [filterName]: value }));

    const loadMore = () => { const nextPage = page + 1; setPage(nextPage); fetchCosmetics(nextPage); };

    // Autenticação e Perfil
    const handleLoginSuccess = (userData) => {
        setUser(userData); 
        setCurrentView('shop'); 
        toast.success(`Bem-vindo, ${userData.username}!`);
        fetchMyPurchasesData(localStorage.getItem('token'));
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.setItem('currentView', 'shop');
        setUser(null);
        setPurchasedIds(new Set());
        setMyPurchases([]);
        setHistory([]);
        setCurrentView('shop');
        setShowUserDropdown(false);
        toast.info("Logout realizado.");
    };

    const handleProfileUpdate = (updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setCurrentView('shop');
        toast.success('Seus dados foram atualizados!');
    };
    
    // Transações (Compra, Recarga, Devolução)
    const openBuyModal = async (item) => {
        if (!user) { 
            toast.warning("Faça login para comprar!"); 
            setCurrentView('login'); 
            return; 
        }
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

            setPurchasedIds(prevIds => {
                const newIds = new Set(prevIds);
                data.purchasedItemIds.forEach(id => newIds.add(id));
                return newIds;
            });
            
            // Recarrega a lista completa de compras
            await fetchMyPurchasesData(token);
            
        } catch (error) { 
            toast.error(error.message);
        } finally {
            setItemToBuy(null);
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

            toast.success(`${itemToRefund.name} devolvido. Você recebeu ${data.refundAmount} V-Bucks.`);
            const updatedUser = { ...user, balance: data.newBalance };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            setPurchasedIds(prevIds => {
                const newIds = new Set(prevIds);
                data.removedItemIds.forEach(id => newIds.delete(id));
                return newIds;
            });
            
            setMyPurchases(prev => prev.filter(item => !data.removedItemIds.includes(item.id)));

            if (currentView === 'my_purchases') {
                await fetchHistory();
            }

        } catch (error) {
            toast.error(error.message);
        } finally {
            setItemToRefund(null);
        }
    };

    // --- RENDERIZAÇÃO ---
    // Tela de loading global
    if (isRestoring) {
        return (
            <div style={{ 
                minHeight: '100vh', 
                backgroundColor: '#0a1426', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'white'
            }}>
                <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />
                <h1 style={{ fontSize: '32px' }}>Carregando VShop...</h1>
            </div>
        );
    }

    // Telas de Login/Registro
    if (currentView === 'login' || currentView === 'register') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)' }}>
                <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />
                <button onClick={showShop} style={{ position: 'absolute', top: 20, left: 20, padding: '10px 20px', backgroundColor: 'transparent', color: 'white', border: '2px solid white', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' }}>← VOLTAR PARA A LOJA</button>
                {currentView === 'login' 
                    ? <Login onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => setCurrentView('register')} /> 
                    : <Register onLoginSuccess={handleLoginSuccess} onSwitchToLogin={() => setCurrentView('login')} />}
            </div>
        );
    }

    // Tela de Editar Perfil
    if (currentView === 'edit_profile') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)' }}>
                <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />
                <button onClick={showShop} style={{ position: 'absolute', top: 20, left: 20, padding: '10px 20px', backgroundColor: 'transparent', color: 'white', border: '2px solid white', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' }}>← VOLTAR PARA A LOJA</button>
                
                <EditProfile 
                    currentUser={user} 
                    onProfileUpdate={handleProfileUpdate} 
                />
            </div>
        );
    }

    // Renderização principal (Loja, Coleção, etc.)
    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
            <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />

            {/* --- MODAIS --- */}
            {itemToBuy && (
                <div 
                    onClick={() => setItemToBuy(null)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{ backgroundColor: '#13223d', padding: '30px', borderRadius: '20px', maxWidth: '450px', width: '90%', textAlign: 'center', border: '1px solid #2a4675', color: 'white' }}
                    >
                        <h2 style={{ fontSize: '32px', marginTop: 0, color: 'white' }}>CONFIRMAR COMPRA</h2>
                        <div style={{ background: RARITY_COLORS[itemToBuy.rarity] || RARITY_COLORS.default, borderRadius: '15px', padding: '20px', margin: '20px auto', width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={itemToBuy.image_url} alt={itemToBuy.name} style={{ width: '140px', height: '140px', objectFit: 'contain', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' }} />
                        </div>
                        <p style={{ fontSize: '24px', margin: '10px 0' }}>{itemToBuy.name}</p>
                        
                        {bundleModalItems.length > 0 && (
                            <p style={{ fontSize: '16px', color: '#ffe600', marginTop: '-5px', marginBottom: '20px', lineHeight: '1.6', padding: '0 10px' }}>
                                Este item faz parte de um bundle, você receberá os itens do conjunto que não possui.
                            </p>
                        )}

                        {bundleModalLoading && (
                            <p style={{ color: '#8ba0c6', fontSize: '14px' }}>Carregando outros itens do bundle...</p>
                        )}
                        {bundleModalItems.length > 0 && (
                            <div style={{ margin: '-10px 0 20px 0' }}>
                                <p style={{ fontSize: '16px', color: 'white', fontWeight: 'bold', margin: '0 0 10px 0' }}>Outros itens do conjunto:</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}> 
                                    {bundleModalItems.map(bItem => {
                                        const itemType = ITEM_TYPE_NAMES[bItem.type] || bItem.type;
                                        const hoverTitle = `${bItem.name} (${itemType})`;
                                        return (
                                            <div key={bItem.id} title={hoverTitle} style={{
                                                background: RARITY_COLORS[bItem.rarity] || RARITY_COLORS.default,
                                                borderRadius: '10px', 
                                                padding: '5px',
                                                width: '60px', 
                                                height: '60px'
                                            }}>
                                                <img src={bItem.image_url} alt={bItem.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        <p style={{ fontSize: '36px', color: '#ffe600', margin: '0 0 30px 0' }}>{itemToBuy.price} <span style={{ fontSize: '20px' }}>V-BUCKS</span></p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button onClick={() => setItemToBuy(null)} style={{ padding: '15px 30px', cursor: 'pointer', backgroundColor: 'transparent', border: '2px solid #666', color: '#ccc', borderRadius: '10px', fontSize: '18px' }}>CANCELAR</button>
                            <button onClick={confirmPurchase} style={{ padding: '15px 40px', cursor: 'pointer', backgroundColor: '#ffe600', color: 'black', border: 'none', borderRadius: '10px', fontSize: '20px', fontWeight: 'bold' }}>COMPRAR AGORA</button>
                        </div>
                    </div>
                </div>
            )}

            {showRechargeModal && (
                <div 
                    onClick={() => setShowRechargeModal(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{ backgroundColor: '#13223d', padding: '30px', borderRadius: '20px', maxWidth: '700px', width: '90%', textAlign: 'center', border: '1px solid #2a4675', color: 'white', position: 'relative' }}
                    >
                        <button onClick={() => setShowRechargeModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: '2px solid #666', color: '#ccc', borderRadius: '50%', width: '30px', height: '30px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>X</button>
                        <h2 style={{ fontSize: '32px', marginTop: 0, color: 'white' }}>RECARREGAR V-BUCKS</h2>
                        <p style={{ color: '#8ba0c6', marginTop: '-10px', marginBottom: '30px' }}>Apenas para simulação. A recarga será salva no banco.</p>
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

            {itemToRefund && (
                <div
                    onClick={() => setItemToRefund(null)}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1001,
                        backdropFilter: 'blur(5px)',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: '#13223d',
                            padding: '30px',
                            borderRadius: '20px',
                            maxWidth: '450px',
                            width: '90%',
                            textAlign: 'center',
                            border: '1px solid #2a4675',
                            color: 'white',
                        }}
                    >
                        <h2 style={{ fontSize: '32px', marginTop: 0, color: '#ef4444' }}>
                            DEVOLVER ITEM
                        </h2>

                        <div style={{ background: RARITY_COLORS[itemToRefund.rarity] || RARITY_COLORS.default, borderRadius: '15px', padding: '20px', margin: '20px auto', width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img
                                src={itemToRefund.image_url}
                                alt={itemToRefund.name}
                                style={{ width: '140px', height: '140px', objectFit: 'contain' }}
                            />
                        </div>

                        <p style={{ fontSize: '24px', margin: '10px 0' }}>
                            {itemToRefund.name}
                        </p>

                        {bundleModalItems.length > 0 ? (
                            <p style={{ fontSize: '18px', color: '#ffe600', margin: '0 0 20px 0', lineHeight: '1.6', padding: '0 10px' }}>
                                Este item faz parte de um bundle. Ao devolver, <strong>todos os itens do bundle</strong> serão removidos e você receberá <strong>{itemToRefund.price_paid} V-Bucks</strong> de volta.
                            </p>
                        ) : (
                            <p style={{ fontSize: '18px', color: '#8ba0c6', margin: '0 0 30px 0', lineHeight: '1.6', padding: '0 10px' }}>
                                Tem certeza que deseja devolver este item? Você receberá <strong>{itemToRefund.price_paid} V-Bucks</strong> de volta.
                            </p>
                        )}

                        {bundleModalLoading && (
                            <p style={{ color: '#8ba0c6', fontSize: '14px' }}>Carregando outros itens do bundle...</p>
                        )}
                        {bundleModalItems.length > 0 && (
                            <div style={{ margin: '-10px 0 30px 0' }}>
                                <p style={{ fontSize: '16px', color: 'white', fontWeight: 'bold', margin: '0 0 10px 0' }}>Outros itens do conjunto:</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
                                    {bundleModalItems.map(bItem => {
                                        const itemType = ITEM_TYPE_NAMES[bItem.type] || bItem.type;
                                        const hoverTitle = `${bItem.name} (${itemType})`;
                                        return (
                                            <div key={bItem.id} title={hoverTitle} style={{ 
                                                background: RARITY_COLORS[bItem.rarity] || RARITY_COLORS.default, 
                                                borderRadius: '10px', 
                                                padding: '5px',
                                                width: '60px', 
                                                height: '60px'
                                            }}>
                                                <img src={bItem.image_url} alt={bItem.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button onClick={() => setItemToRefund(null)} style={{ padding: '15px 30px', cursor: 'pointer', backgroundColor: 'transparent', border: '2px solid #666', color: '#ccc', borderRadius: '10px', fontSize: '18px' }}>CANCELAR</button>
                            <button onClick={handleRefund} style={{ padding: '15px 40px', cursor: 'pointer', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', fontSize: '20px', fontWeight: 'bold' }}>DEVOLVER</button>
                        </div>
                    </div>
                </div>
            )}

            {selectedItem && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, backdropFilter: 'blur(5px)' }} onClick={() => setSelectedItem(null)}>
                    <div style={{ backgroundColor: '#13223d', padding: '30px', borderRadius: '20px', maxWidth: '600px', width: '90%', border: '1px solid #2a4675', color: 'white', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelectedItem(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: '2px solid #666', color: '#ccc', borderRadius: '50%', width: '30px', height: '30px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>X</button>
                        <h2 style={{ fontSize: '32px', marginTop: 0, color: 'white' }}>{selectedItem.name}</h2>
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                            
                            <div style={{ 
                                background: RARITY_COLORS[selectedItem.rarity] || RARITY_COLORS.default, 
                                borderRadius: '15px', 
                                padding: '20px', 
                                width: '250px',
                                flexShrink: 0
                            }}>
                                <img src={selectedItem.image_url} alt={selectedItem.name} style={{ width: '100%', objectFit: 'contain' }} />
                            </div>
                            
                            <div style={{ 
                                flex: 1,
                                display: 'flex', 
                                flexDirection: 'column', 
                                height: '100%',
                                minWidth: 0
                            }}>
                                <p style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#8ba0c6', lineHeight: '1.6' }}>{selectedItem.description || "Sem descrição."}</p>
                                <p style={{ margin: '0 0 5px 0' }}><strong>Raridade:</strong> {selectedItem.rarity}</p>
                                <p style={{ margin: '0 0 5px 0' }}><strong>Tipo:</strong> {selectedItem.type}</p>
                                <p style={{ margin: '0 0 5px 0' }}><strong>Set:</strong> {selectedItem.set_text || "N/A"}</p>
                                <p style={{ margin: '0 0 5px 0' }}><strong>Introdução:</strong> {selectedItem.introduction_text || "N/A"}</p>
                                <p style={{ margin: '0 0 20px 0' }}><strong>Data Adic.:</strong> {new Date(selectedItem.added_at).toLocaleDateString('pt-BR')}</p>

                                {bundleModalLoading && (
                                    <p style={{ color: '#8ba0c6', fontSize: '14px' }}>Carregando outros itens do bundle...</p>
                                )}
                                {bundleModalItems.length > 0 && (
                                    <div style={{ margin: '10px 0 20px 0' }}>
                                        <p style={{ fontSize: '16px', color: 'white', fontWeight: 'bold', margin: '0 0 10px 0' }}>Itens incluídos:</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start', gap: '10px' }}>
                                            {bundleModalItems.map(bItem => {
                                                const itemType = ITEM_TYPE_NAMES[bItem.type] || bItem.type;
                                                const hoverTitle = `${bItem.name} (${itemType})`;
                                                return (
                                                    <div key={bItem.id} title={hoverTitle} style={{
                                                        background: RARITY_COLORS[bItem.rarity] || RARITY_COLORS.default,
                                                        borderRadius: '10px', 
                                                        padding: '5px',
                                                        width: '60px', 
                                                        height: '60px'
                                                    }}>
                                                        <img src={bItem.image_url} alt={bItem.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Lógica de Botão do Modal */}
                                {!purchasedIds.has(selectedItem.id) && selectedItem.price > 0 && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
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
                                {purchasedIds.has(selectedItem.id) && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedItem(null);
                                            const fullPurchaseData = myPurchases.find(p => p.id === selectedItem.id);
                                            setItemToRefund(fullPurchaseData || selectedItem);
                                        }}
                                        style={{ 
                                            width: '100%', padding: '15px', backgroundColor: '#ef4444',
                                            border: 'none', 
                                            borderRadius: '12px', color: 'white', fontSize: '22px', 
                                            cursor: 'pointer', marginTop: 'auto'
                                        }}
                                    >
                                        DEVOLVER ITEM
                                    </button>
                                )}
                                {!purchasedIds.has(selectedItem.id) && selectedItem.price <= 0 && (
                                    <button 
                                        disabled 
                                        style={{ 
                                            width: '100%', padding: '15px', backgroundColor: 'rgba(255,255,255,0.1)', 
                                            border: 'none', borderRadius: '12px', 
                                            color: 'rgba(255,255,255,0.4)', marginTop: 'auto'
                                        }}
                                    >
                                        INDISPONÍVEL
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
                    
                    {currentView === 'shop' && (
                         <button onClick={showCommunityPage} style={{ padding: '10px 20px', backgroundColor: 'transparent', color: 'white', border: '2px solid white', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>COMUNIDADE</button>
                    )}
                    {(currentView === 'community' || currentView === 'my_purchases' || currentView === 'edit_profile') && (
                        <button onClick={showShop} style={{ padding: '10px 20px', backgroundColor: 'transparent', color: '#ffe600', border: '2px solid #ffe600', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>← VOLTAR À LOJA</button>
                    )}

                    {currentView === 'user_profile' && (
                        <button onClick={showCommunityPage} style={{ padding: '10px 20px', backgroundColor: 'transparent', color: '#ffe600', border: '2px solid #ffe600', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>← VOLTAR À COMUNIDADE</button>
                    )}
                </div>
                <div>
                    {user ? (
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'flex-start',
                            gap: '30px' 
                        }}>
                            <div style={{ textAlign: 'right', position: 'relative' }}>
                                <div ref={dropdownRef} style={{ textAlign: 'right', position: 'relative' }}>
                                    <div onClick={() => setShowUserDropdown(!showUserDropdown)} style={{ cursor: 'pointer' }}>
                                        <div style={{ fontSize: '12px', color: '#8ba0c6', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>
                                            Jogador
                                        </div>
                                        <div style={{ fontSize: '20px', color: 'white', fontWeight: 'bold', lineHeight: '1.2' }}>{user.username} ▼</div>
                                    </div>
                                    {showUserDropdown && (
                                        <div style={{
                                            position: 'absolute', top: '55px', right: 0,
                                            backgroundColor: '#13223d', border: '1px solid #2a4675',
                                            borderRadius: '10px', overflow: 'hidden', zIndex: 101,
                                            width: '220px', textAlign: 'left'
                                        }}>
                                            <div onClick={showMyPurchases} style={{ padding: '15px 20px', color: 'white', cursor: 'pointer', borderBottom: '1px solid #2a4675' }}>Minha Coleção</div>
                                            <div onClick={showEditProfile} style={{ padding: '15px 20px', color: 'white', cursor: 'pointer', borderBottom: '1px solid #2a4675' }}>Alterar Dados</div>
                                            <div onClick={handleLogout} style={{ padding: '15px 20px', color: '#ef4444', cursor: 'pointer' }}>Sair</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ width: '1px', height: '40px', backgroundColor: '#2a4675' }}></div>

                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '12px', color: '#8ba0c6', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>
                                    Saldo V-Bucks
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end'}}>
                                    <div style={{fontSize: '22px', color: '#ffe600', fontWeight: 'bold', lineHeight: '1.2'}}>
                                        {user.balance.toLocaleString()}
                                    </div>
                                    <button
                                        onClick={() => setShowRechargeModal(true)}
                                        title="Recarregar V-Bucks"
                                        style={{
                                            backgroundColor: '#ffe600', border: 'none', borderRadius: '50%',
                                            width: '24px', height: '24px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                                        }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
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
                    <h1 style={{ fontSize: '120px', margin: 0, lineHeight: 1, textShadow: '0 5px 30px rgba(0,120,255,0.5)' }}>LOJA DE COSMÉTICOS</h1>
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
                        <input type="text" placeholder="🔍 Buscar por nome..." value={filters.name} onChange={(e) => handleFilterValueChange('name', e.target.value)} style={{ flex: 2, minWidth: '200px', fontSize: '16px' }} />
                        <select value={filters.rarity} onChange={(e) => handleFilterValueChange('rarity', e.target.value)} style={{ flex: 1, minWidth: '150px', fontSize: '16px' }}>
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
                        <select value={filters.type} onChange={(e) => handleFilterValueChange('type', e.target.value)} style={{ flex: 1, minWidth: '150px', fontSize: '16px' }}>
                            <option value="">🎒 Todo Tipo</option>
                            <option value="outfit">Traje</option>
                            <option value="backpack">Mochila</option>
                            <option value="pickaxe">Picareta</option>
                            <option value="emote">Gesto</option>
                        </select>
                        
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <span style={{fontSize: '14px', fontWeight: 'bold', color: '#8ba0c6'}}>De:</span>
                            <input type="date" value={filters.startDate} onChange={(e) => handleFilterValueChange('startDate', e.target.value)} style={{ fontSize: '16px', padding: '8px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <span style={{fontSize: '14px', fontWeight: 'bold', color: '#8ba0c6'}}>Até:</span>
                            <input type="date" value={filters.endDate} onChange={(e) => handleFilterValueChange('endDate', e.target.value)} style={{ fontSize: '16px', padding: '8px' }} />
                        </div>

                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', backgroundColor: '#0a1426', padding: '10px 20px', borderRadius: '10px', border: '1px solid #1e3a5f', marginLeft: 'auto' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#8ba0c6', fontWeight: 'bold' }}>
                                <input type="checkbox" checked={filters.forSale} onChange={(e) => handleFilterValueChange('forSale', e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#ffe600' }} /> Apenas à venda
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#8ba0c6', fontWeight: 'bold' }}>
                                <input type="checkbox" checked={filters.isNew} onChange={(e) => handleFilterValueChange('isNew', e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#ffe600' }} /> Itens Novos
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#8ba0c6', fontWeight: 'bold' }}>
                                <input type="checkbox" checked={filters.onPromotion} onChange={(e) => handleFilterValueChange('onPromotion', e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#ffe600' }} /> Em Promoção
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#8ba0c6', fontWeight: 'bold' }}>
                                <input type="checkbox" checked={filters.isBundle} onChange={(e) => handleFilterValueChange('isBundle', e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#ffe600' }} /> Apenas Bundles
                            </label>
                            <label style={{ 
                                display: 'flex', alignItems: 'center', gap: '10px', 
                                color: '#8ba0c6', fontWeight: 'bold',
                                cursor: !user ? 'not-allowed' : 'pointer',
                                opacity: !user ? 0.5 : 1
                            }}>
                                <input 
                                    type="checkbox" 
                                    checked={filters.owned} 
                                    onChange={(e) => handleFilterValueChange('owned', e.target.checked)} 
                                    style={{ width: '20px', height: '20px', accentColor: '#ffe600' }}
                                    disabled={!user}
                                /> Itens Obtidos
                            </label>
                        </div>
                        
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
                                const isOwned = purchasedIds.has(item.id);
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
                                                top: item.is_new ? 55 : 15,
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
                                                        backgroundColor: item.on_promotion ? '#ffe600' : '#0078ff', 
                                                        border: 'none', 
                                                        borderRadius: '12px', 
                                                        color: item.on_promotion ? 'black' : 'white', 
                                                        fontSize: '22px', 
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer',
                                                        minHeight: '65px', 
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        lineHeight: '1.2'
                                                    }}
                                                >
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
                        {loading && <p style={{ color: '#8ba0c6', fontSize: '20px', textAlign: 'center' }}>Carregando histórico...</p>}
                        {!loading && myPurchases.length === 0 && (
                            <p style={{ color: '#8ba0c6', fontSize: '24px', textAlign: 'center' }}>Sua coleção está vazia. Volte à loja para adquirir itens!</p>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '30px' }}>
                            {myPurchases.map((item) => {
                                const bgColor = RARITY_COLORS[item.rarity?.toLowerCase()] || RARITY_COLORS.default;
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedItem(item)}
                                        style={{ 
                                            cursor: 'pointer',
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
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setItemToRefund(item);
                                                }}
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
                        
                        {/* --- SEÇÃO DE HISTÓRICO --- */}
                        <div style={{ marginTop: '80px', borderTop: '2px solid #2a4675', paddingTop: '40px' }}>
                                <h2 style={{ fontSize: '48px', textAlign: 'center', color: 'white', marginBottom: '40px' }}>Histórico de Transações</h2>
                                
                                {history.length === 0 && !loading && (
                                    <p style={{ color: '#8ba0c6', fontSize: '20px', textAlign: 'center' }}>Nenhuma transação registrada ainda.</p>
                                )}
                                
                                <div style={{ 
                                    maxWidth: '800px', margin: '0 auto', 
                                    backgroundColor: '#13223d', borderRadius: '15px', 
                                    border: '1px solid #2a4675', overflow: 'hidden' 
                                }}>
                                    {history.map((tx) => {
                                        const isBundle = tx.bundle_id && tx.bundle_items && tx.bundle_items.length > 0;
                                        const displayName = isBundle ? (tx.set_text || tx.name) : tx.name;
                                        const mainRarity = isBundle ? tx.bundle_items[0].rarity : tx.rarity;

                                        return (
                                            <div key={tx.id} style={{
                                                display: 'flex', alignItems: 'center', gap: '20px',
                                                padding: '20px 25px',
                                                borderBottom: '1px solid #2a4675',
                                                position: 'relative',
                                                overflow: 'visible',
                                                minHeight: '100px'
                                            }}>
                                                
                                                {/* Contêiner da Imagem */}
                                                <div style={{
                                                    width: '80px', 
                                                    height: '80px', 
                                                    flexShrink: 0,
                                                    position: 'relative',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    zIndex: 5
                                                }}>

                                                    {(isBundle && tx.bundle_items) ? (
                                                        <div style={{ 
                                                            position: 'absolute', 
                                                            top: 0, left: 0, right: 0, bottom: 0,
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            justifyContent: 'center'
                                                        }} title="Este item faz parte de um pacote">
                                                            
                                                            {/* Card Esquerdo de fundo */}
                                                            {tx.bundle_items[1] && (
                                                                <div style={{
                                                                    position: 'absolute', zIndex: 1,
                                                                    width: '60px', height: '60px',
                                                                    background: RARITY_COLORS[tx.bundle_items[1].rarity] || RARITY_COLORS.default,
                                                                    borderRadius: '8px',
                                                                    padding: '3px',
                                                                    transform: 'translateX(-25px) rotate(-30deg)',
                                                                    filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.4))',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                }}>
                                                                    <img src={tx.bundle_items[1].image_url} alt="" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                                                                </div>
                                                            )}
                                                            
                                                            {/* Card Direito de fundo */}
                                                            {tx.bundle_items[2] && (
                                                                <div style={{
                                                                    position: 'absolute', zIndex: 2,
                                                                    width: '60px', height: '60px',
                                                                    background: RARITY_COLORS[tx.bundle_items[2].rarity] || RARITY_COLORS.default,
                                                                    borderRadius: '8px',
                                                                    padding: '3px',
                                                                    transform: 'translateX(25px) rotate(30deg)',
                                                                    filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.4))',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                }}>
                                                                    <img src={tx.bundle_items[2].image_url} alt="" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                                                                </div>
                                                            )}

                                                            {/* Card Principal */}
                                                            <div style={{
                                                                position: 'relative', zIndex: 3,
                                                                width: '70px', height: '70px',
                                                                background: RARITY_COLORS[mainRarity] || RARITY_COLORS.default,
                                                                borderRadius: '10px',
                                                                padding: '5px',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                filter: 'drop-shadow(0 5px 15px rgba(0,0,0,0.6))'
                                                            }}>
                                                                <img 
                                                                    src={tx.bundle_items[0].image_url} 
                                                                    alt={displayName} 
                                                                    style={{ width: '90%', height: '90%', objectFit: 'contain' }} 
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // Fallback para Item Único
                                                        <div style={{
                                                            position: 'relative', zIndex: 3,
                                                            width: '70px', height: '70px',
                                                            background: RARITY_COLORS[mainRarity] || RARITY_COLORS.default,
                                                            borderRadius: '10px',
                                                            padding: '5px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}>
                                                            <img src={tx.image_url} alt={tx.name} style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Texto */}
                                                <div style={{ flex: 1, color: 'white', fontSize: '18px', paddingLeft: '20px' }}>
                                                    <strong>{displayName}</strong>
                                                    {isBundle && <span style={{fontSize: '12px', color: '#8ba0c6', display: 'block', fontWeight: 'normal', marginTop: '2px' }}>Pacote</span>}
                                                    <div style={{ fontSize: '14px', color: '#8ba0c6', marginTop: '2px', textTransform: 'uppercase' }}>
                                                        {tx.transaction_type === 'c' ? 'Adquirido' : 'Devolvido'}
                                                    </div>
                                                </div>

                                                <div style={{ fontSize: '14px', color: '#8ba0c6', textAlign: 'right' }}>
                                                    {new Date(tx.transaction_date).toLocaleDateString('pt-BR')}
                                                    <br />
                                                    {new Date(tx.transaction_date).toLocaleTimeString('pt-BR')}
                                                </div>

                                                <div style={{
                                                    fontSize: '22px', 
                                                    fontWeight: 'bold', 
                                                    color: tx.amount > 0 ? '#22c55e' : '#ffe600',
                                                    minWidth: '100px',
                                                    textAlign: 'right'
                                                }}>
                                                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                    </div>
                )}
                
                {/* --- COMUNIDADE (PÓDIO + LISTA) --- */}
                {currentView === 'community' && (
                    <div>
                        <h1 style={{ fontSize: '72px', textAlign: 'center', color: '#ffe600', marginBottom: '50px' }}>Comunidade</h1>
                        
                        <div style={{ 
                            padding: '30px', backgroundColor: '#13223d', borderRadius: '20px', 
                            border: '1px solid #2a4675', marginBottom: '40px', 
                        }}>
                            <h2 style={{ color: 'white', margin: '0 0 25px 0', textAlign: 'center', fontSize: '32px' }}>🏆 Pódio dos Colecionadores</h2>
                            {loading && <p style={{ color: 'white', textAlign: 'center' }}>Carregando...</p>}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                                {rankingPodium.map((u, index) => (
                                    <div 
                                        key={u.id}
                                        onClick={() => showUserProfile(u.username)}
                                        style={{ 
                                            color: 'white', textAlign: 'center', padding: '20px', 
                                            backgroundColor: '#0a1426', borderRadius: '15px', 
                                            border: '1px solid #2a4675', cursor: 'pointer',
                                            transform: index === 0 ? 'scale(1.05)' : 'scale(1)',
                                            borderColor: index === 0 ? '#b8860b' : (index === 1 ? '#c0c0c0' : '#cd7f32')
                                        }}
                                    >
                                        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>#{index + 1}</div>
                                        <div style={{ 
                                            fontSize: '24px', 
                                            color: 'white', 
                                            margin: '10px 0',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>{u.username}</div>
                                        <div style={{ fontSize: '20px', color: '#ffe600' }}>{u.collection_value.toLocaleString()} V-Bucks</div>
                                        <div style={{ fontSize: '16px', color: '#8ba0c6', marginTop: '5px' }}>{u.item_count} itens</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <h2 style={{ color: 'white', margin: '40px 0 20px 0', textAlign: 'center', fontSize: '32px' }}>Todos os Colecionadores</h2>
                        <div style={{ backgroundColor: '#13223d', borderRadius: '15px', border: '1px solid #2a4675', overflow: 'hidden' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr 2fr 2fr', padding: '15px 25px', backgroundColor: '#0a1426', borderBottom: '1px solid #2a4675', color: '#8ba0c6', fontWeight: 'bold' }}>
                                <div>Pos.</div>
                                <div>Usuário</div>
                                <div>Nº de Itens</div>
                                <div>Valor da Coleção</div>
                            </div>
                            {loading && <p style={{ color: 'white', textAlign: 'center', padding: '20px' }}>Carregando...</p>}
                            {!loading && publicUsers.list.map((u, index) => (
                                <div 
                                    key={u.id}
                                    onClick={() => showUserProfile(u.username)}
                                    style={{ 
                                        display: 'grid', gridTemplateColumns: '1fr 3fr 2fr 2fr', 
                                        padding: '20px 25px', borderBottom: '1px solid #2a4675', 
                                        color: 'white', fontSize: '18px', cursor: 'pointer' 
                                    }}
                                >
                                    <div>#{(publicUsersPage - 1) * 20 + index + 1}</div>
                                    <div>{u.username}</div>
                                    <div>{u.item_count}</div>
                                    <div style={{ color: '#ffe600', fontWeight: 'bold' }}>{u.collection_value.toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ textAlign: 'center', margin: '30px 0' }}>
                            <button 
                                onClick={() => fetchCommunityData(publicUsersPage - 1)} 
                                disabled={publicUsersPage <= 1 || loading}
                                style={{padding: '10px 20px', fontSize: '16px', marginRight: '10px'}}
                            >
                                Anterior
                            </button>
                            <span style={{ color: 'white', fontSize: '18px' }}>Página {publicUsersPage} de {publicUsers.totalPages}</span>
                            <button 
                                onClick={() => fetchCommunityData(publicUsersPage + 1)} 
                                disabled={publicUsersPage >= publicUsers.totalPages || loading}
                                style={{padding: '10px 20px', fontSize: '16px', marginLeft: '10px'}}
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                )}

                {/* --- PERFIL PÚBLICO --- */}
                {currentView === 'user_profile' && (
                    <div>
                        {profileLoading && <p style={{ color: 'white', fontSize: '24px', textAlign: 'center' }}>Carregando perfil...</p>}
                        
                        {!profileLoading && profileData.user && (
                            <>
                                <h1 style={{ fontSize: '72px', textAlign: 'center', color: '#ffe600', marginBottom: '50px' }}>
                                    Coleção de {profileData.user.username}
                                </h1>
                                
                                {profileData.items.length === 0 && (
                                    <p style={{ color: '#8ba0c6', fontSize: '24px', textAlign: 'center' }}>Este usuário não possui itens.</p>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '30px' }}>
                                    {profileData.items.map((item) => {
                                        const bgColor = RARITY_COLORS[item.rarity?.toLowerCase()] || RARITY_COLORS.default;
                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => setSelectedItem(item)}
                                                style={{ 
                                                    cursor: 'pointer',
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
                                                        onClick={() => setSelectedItem(item)}
                                                        style={{ 
                                                            width: '100%', padding: '15px', backgroundColor: '#0078ff', border: 'none', 
                                                            borderRadius: '12px', color: 'white', fontSize: '20px', 
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        VER DETALHES
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                )}
                
            </div>
        </div>
    );
}

export default App;