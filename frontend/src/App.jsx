import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Home as HomeIcon, Database, FileText, FileInput, Code2, Settings } from 'lucide-react';
import Home from './pages/Home';
import Sql from './pages/Sql';
import SemanticLayer from './pages/SemanticLayer';
import Documents from './pages/Documents';
import WebPages from './pages/WebPages';
import FineTuning from './pages/FineTuning';
import './index.css';


function Sidebar() {
  return (
    <div className="sidebar">
      <h1>AI Assistant</h1>
      <div className="nav-links">
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
          <HomeIcon size={20} /> Home
        </NavLink>
        <NavLink to="/sql" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Database size={20} /> SQL
        </NavLink>
        <NavLink to="/semantic-layer" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Code2 size={20} /> Semantic Layer
        </NavLink>
        <NavLink to="/documents" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <FileText size={20} /> Documents
        </NavLink>
        <NavLink to="/web-pages" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <FileInput size={20} /> Web Pages
        </NavLink>
        <NavLink to="/fine-tuning" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Settings size={20} /> Fine Tuning
        </NavLink>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sql" element={<Sql />} />
            <Route path="/semantic-layer" element={<SemanticLayer />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/web-pages" element={<WebPages />} />
            <Route path="/fine-tuning" element={<FineTuning />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
