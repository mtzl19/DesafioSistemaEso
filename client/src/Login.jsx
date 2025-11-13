import React, { useState } from 'react';
import { toast } from 'react-toastify'; 

function Login({ onLoginSuccess, onSwitchToRegister }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao logar');
            
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            onLoginSuccess(data.user);
        } catch (err) {
        
            // Em vez de mostrar 'err.message', mostra uma mensagem padrão
            toast.error('Email ou senha incorretos.');

            // Erro detalhado no console para depuração
            console.error('Falha no login:', err.message); 
        }
    };

    return (
        <div style={{ width: '400px', padding: '30px', backgroundColor: '#13223d', borderRadius: '20px', border: '1px solid #2a4675', color: 'white' }}>
            <h2 style={{ textAlign: 'center', fontSize: '32px', marginTop: 0 }}>ENTRAR NA CONTA</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <input type="email" placeholder="Seu email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{fontSize: '16px'}} />
                <input type="password" placeholder="Sua senha" value={password} onChange={(e) => setPassword(e.target.value)} required style={{fontSize: '16px'}} />
                <button type="submit" style={{ padding: '15px', backgroundColor: '#0078ff', color: 'white', border: 'none', borderRadius: '10px', fontSize: '18px', cursor: 'pointer' }}>
                    ENTRAR
                </button>
            </form>
            <p style={{ marginTop: '20px', textAlign: 'center', color: '#8ba0c6' }}>
                Não tem conta? <button onClick={onSwitchToRegister} style={{ background: 'none', border: 'none', color: '#ffe600', cursor: 'pointer', textDecoration: 'underline', fontSize: '16px', padding: 0 }}>Registre-se aqui</button>
            </p>
        </div>
    );
}
export default Login;