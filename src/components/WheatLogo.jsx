import React from 'react';
import './WheatLogo.css';

export default function WheatLogo({ size = 32, className = "" }) {
    return (
        <div className={`wheat-logo-container ${className}`} style={{ width: size, height: size }}>
            <svg
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="wheat-svg-bouquet"
            >
                <defs>
                    <linearGradient id="wheat-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffd700" /> {/* Gold */}
                        <stop offset="50%" stopColor="#e9c46a" /> {/* Goldenrod */}
                        <stop offset="100%" stopColor="#f4a261" /> {/* Sandy Brown */}
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Left Stalk */}
                <g className="stalk-group stalk-left">
                    <path d="M50 95C40 80 35 60 35 40" stroke="#d4a373" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="35" cy="40" r="3" fill="url(#wheat-gradient)" />
                    <circle cx="32" cy="45" r="2.5" fill="url(#wheat-gradient)" />
                    <circle cx="38" cy="45" r="2.5" fill="url(#wheat-gradient)" />
                    <circle cx="30" cy="52" r="2" fill="url(#wheat-gradient)" />
                    <circle cx="40" cy="52" r="2" fill="url(#wheat-gradient)" />
                </g>

                {/* Middle Stalk */}
                <g className="stalk-group stalk-middle">
                    <path d="M50 95C50 75 50 55 50 25" stroke="#d4a373" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="50" cy="25" r="4" fill="url(#wheat-gradient)" filter="url(#glow)" />
                    <circle cx="46" cy="32" r="3" fill="url(#wheat-gradient)" />
                    <circle cx="54" cy="32" r="3" fill="url(#wheat-gradient)" />
                    <circle cx="45" cy="40" r="2.8" fill="url(#wheat-gradient)" />
                    <circle cx="55" cy="40" r="2.8" fill="url(#wheat-gradient)" />
                    <circle cx="46" cy="48" r="2.5" fill="url(#wheat-gradient)" />
                    <circle cx="54" cy="48" r="2.5" fill="url(#wheat-gradient)" />
                </g>

                {/* Right Stalk */}
                <g className="stalk-group stalk-right">
                    <path d="M50 95C60 80 65 60 65 40" stroke="#d4a373" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="65" cy="40" r="3" fill="url(#wheat-gradient)" />
                    <circle cx="62" cy="45" r="2.5" fill="url(#wheat-gradient)" />
                    <circle cx="68" cy="45" r="2.5" fill="url(#wheat-gradient)" />
                    <circle cx="60" cy="52" r="2" fill="url(#wheat-gradient)" />
                    <circle cx="70" cy="52" r="2" fill="url(#wheat-gradient)" />
                </g>
            </svg>
        </div>
    );
}
