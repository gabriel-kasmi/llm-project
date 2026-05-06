import React from 'react';
import { NavLink } from 'react-router-dom';
import { Database, FileText, FileInput, Code2, Settings, ArrowRight } from 'lucide-react';

export default function Home() {
  const cards = [
    { title: 'SQL', desc: 'Connect to BigQuery and translate natural language to SQL.', icon: <Database size={24} />, to: '/sql' },
    { title: 'Semantic Layer', desc: 'Ask questions about your Lightdash project.', icon: <Code2 size={24} />, to: '/semantic-layer' },
    { title: 'Documents', desc: 'Embed text and PDF files and chat with an LLm about their content.', icon: <FileText size={24} />, to: '/documents' },
    { title: 'Web Pages', desc: 'Embed web pages and chat with an LLm about their content.', icon: <FileInput size={24} />, to: '/web-pages' },
    { title: 'Fine Tuning', desc: 'Fine-tune Gemini models using your data.', icon: <Settings size={24} />, to: '/fine-tuning' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Welcome to AI Assistant</h1>
        <p>Select a tool below to get started.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
        {cards.map((card) => (
          <NavLink to={card.to} key={card.to} className="card glass" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ background: 'var(--accent-color)', color: '#fff', borderRadius: '8px', padding: '8px' }}>{card.icon}</div>
              <h3 style={{ margin: 0 }}>{card.title}</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 16px 0', flex: 1 }}>{card.desc}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-color)', fontWeight: 600, fontSize: '0.9rem' }}>
              Open <ArrowRight size={16} />
            </div>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
