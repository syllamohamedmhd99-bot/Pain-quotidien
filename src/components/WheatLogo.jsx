import React from 'react';
// Triggering deployment refresh after Vercel limit reset
import logo from '../assets/logo.png';
import './WheatLogo.css';

export default function WheatLogo({ size = 32, className = "" }) {
    return (
        <div className={`wheat-logo-container ${className}`} style={{ width: size, height: size }}>
            <img
                src={logo}
                alt="Pain Doré Logo"
                className="site-logo-img"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
        </div>
    );
}
