import React, { useState } from 'react';
import { toast } from 'react-toastify';

function Register({ onLoginSuccess, onSwitchToLogin }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:3001/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao registrar');
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            onLoginSuccess(data.user);
        } catch (err) {
            toast.error(err.message); 
        }
    };

    return (
        <div style={{ width: '400px', padding: '30px', backgroundColor: '#13223d', borderRadius: '20px', border: '1px solid #2a4675', color: 'white' }}>
            <h2 style={{ textAlign: 'center', fontSize: '32px', marginTop: 0 }}>CRIAR CONTA</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <input type="text" placeholder="Nome de Usuário" value={username} onChange={(e) => setUsername(e.target.value)} required style={{fontSize: '16px'}} />
                <input type="email" placeholder="Seu email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{fontSize: '16px'}} />
                <input type="password" placeholder="Senha segura" value={password} onChange={(e) => setPassword(e.target.value)} required style={{fontSize: '16px'}} />
                <button type="submit" style={{ padding: '15px', backgroundColor: '#ffe600', color: 'black', border: 'none', borderRadius: '10px', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}>
                    CADASTRAR E GANHAR 10.000 V-BUCKS
                </button>
            </form>
            <p style={{ marginTop: '20px', textAlign: 'center', color: '#8ba0c6' }}>
                Já tem conta? <button onClick={onSwitchToLogin} style={{ background: 'none', border: 'none', color: '#ffe600', cursor: 'pointer', textDecoration: 'underline', fontSize: '16px', padding: 0 }}>Faça login</button>
            </p>
        </div>
    );
}
export default Register;