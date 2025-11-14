import React, { useState } from 'react';
import { toast } from 'react-toastify';

function Register({ onLoginSuccess, onSwitchToLogin }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validador do campo de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error("Por favor, insira um email válido.");
            return;
        }

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
                <button
                    type="submit"
                    style={{
                        padding: '18px 32px',
                        backgroundColor: '#ffe600',
                        color: '#111',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '18px',
                        lineHeight: '1.5',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                    }}
                    onMouseOver={e => {
                        e.currentTarget.style.transform = 'scale(1.04)';
                        e.currentTarget.style.boxShadow = '0 6px 14px rgba(0, 0, 0, 0.2)';
                    }}
                    onMouseOut={e => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    }}
                >
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