import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

function EditProfile({ currentUser, onProfileUpdate }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Pré-preenche o nome de usuário atual quando o componente carregar
    useEffect(() => {
        if (currentUser) {
            setUsername(currentUser.username);
        }
    }, [currentUser]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // 1. Monta o corpo da requisição
        const body = {};
        // Só envia o username se ele mudou
        if (username !== currentUser.username) {
            body.username = username;
        }
        // Só envia a senha se ela foi preenchida
        if (password) {
            body.password = password;
        }

        // 2. Verifica se há algo para enviar
        if (Object.keys(body).length === 0) {
            toast.info('Nenhum dado foi alterado.');
            setLoading(false);
            return;
        }

        // 3. Envia para a API
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3001/api/user/profile', {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao atualizar');

            // 4. Sucesso: Chama o handler do App.jsx
            onProfileUpdate(data.user);

        } catch (err) {
            toast.error(err.message); 
            setLoading(false);
        }
    };

    const inputStyle = {
        fontSize: '16px',
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: 'white',
        color: 'black',
        boxSizing: 'border-box',
        marginTop: '5px'
    };

    return (
        <div style={{ width: '400px', padding: '30px', backgroundColor: '#13223d', borderRadius: '20px', border: '1px solid #2a4675', color: 'white' }}>
            <h2 style={{ textAlign: 'center', fontSize: '32px', marginTop: 0 }}>ALTERAR DADOS</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div>
                    <label style={{ color: '#8ba0c6', fontSize: '14px', fontWeight: 'bold' }}>Email (não pode ser alterado)</label>
                    <input 
                        type="email" 
                        value={currentUser.email} 
                        readOnly 
                        disabled 
                        style={{...inputStyle, backgroundColor: '#0a1426', color: '#8ba0c6', border: '1px solid #2a4675', cursor: 'not-allowed'}} 
                    />
                </div>
                
                <div>
                    <label style={{ color: '#8ba0c6', fontSize: '14px', fontWeight: 'bold' }}>Nome de Usuário</label>
                    <input 
                        type="text" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        required 
                        style={inputStyle} 
                    />
                </div>

                <div>
                    <label style={{ color: '#8ba0c6', fontSize: '14px', fontWeight: 'bold' }}>Nova Senha</label>
                    <input 
                        type="password" 
                        placeholder="Deixe em branco para não alterar" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        style={inputStyle} 
                    />
                </div>
                
                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        padding: '18px 32px',
                        backgroundColor: loading ? '#6c757d' : '#ffe600',
                        color: 'black',
                        textShadow: '0px 1px 3px rgba(255, 255, 255, 0.8)',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '18px',
                        fontWeight: '700',
                        letterSpacing: '1.5px',
                        textTransform: 'uppercase',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        marginTop: '10px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                    }}
                    onMouseOver={e => {
                        if (!loading) {
                            e.currentTarget.style.transform = 'scale(1.04)';
                            e.currentTarget.style.boxShadow = '0 6px 14px rgba(0, 0, 0, 0.2)';
                        }
                    }}
                    onMouseOut={e => {
                        if (!loading) {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                        }
                    }}
                >
                    {loading ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                </button>
            </form>
        </div>
    );
}
export default EditProfile;