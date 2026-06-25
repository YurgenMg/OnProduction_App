"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Plus, CalendarDays, Users, Wallet } from 'lucide-react';

export default function QuickStartButton() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation support
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <div style={styles.container} ref={menuRef}>
      {/* Dropdown Menu */}
      <div style={{
        ...styles.menuWrapper,
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(16px)',
        pointerEvents: isOpen ? 'auto' : 'none'
      }}>
        <Link 
          href="/dashboard/caja?nueva=true" 
          onClick={closeMenu}
          className="glass-panel"
          style={styles.menuItem}
        >
          <Wallet size={18} color="var(--color-success)" />
          <span style={styles.menuText}>Nueva Transacción</span>
        </Link>
        
        <Link 
          href="/dashboard/clientes?nuevo=true" 
          onClick={closeMenu}
          className="glass-panel"
          style={styles.menuItem}
        >
          <Users size={18} color="var(--color-info)" />
          <span style={styles.menuText}>Nuevo Cliente</span>
        </Link>
        
        <Link 
          href="/dashboard/eventos" 
          onClick={closeMenu}
          className="glass-panel"
          style={styles.menuItem}
        >
          <CalendarDays size={18} color="var(--accent-primary)" />
          <span style={styles.menuText}>Nuevo Evento</span>
        </Link>
      </div>

      {/* FAB Main Button */}
      <button
        onClick={toggleMenu}
        className="btn btn-primary"
        style={{
          ...styles.fabButton,
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)'
        }}
        aria-label="Inicio Rápido"
        aria-expanded={isOpen}
      >
        <Plus size={28} />
      </button>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'fixed',
    bottom: '32px',
    right: '32px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  menuWrapper: {
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transformOrigin: 'bottom right'
  },
  menuItem: {
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textDecoration: 'none',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    width: 'max-content',
    minWidth: '190px'
  },
  menuText: {
    fontSize: '14px',
    fontWeight: 600
  },
  fabButton: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: 'var(--shadow-glow)',
    cursor: 'pointer'
  }
};
