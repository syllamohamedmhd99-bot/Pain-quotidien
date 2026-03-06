import React from 'react';
import { Wheat } from 'lucide-react';
import './WheatLogo.css';

export default function WheatLogo({ size = 32, className = "" }) {
    return (
        <div className={`wheat-logo-container ${className}`} style={{ width: size, height: size }}>
            <Wheat size={size * 0.75} className="wheat-stalk stalk-1" />
            <Wheat size={size * 1} className="wheat-stalk stalk-2" />
            <Wheat size={size * 0.75} className="wheat-stalk stalk-3" />
        </div>
    );
}
