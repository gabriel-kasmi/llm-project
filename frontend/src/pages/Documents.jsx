import React, { useState } from 'react';
import axios from 'axios';
import { Send, FileUp } from 'lucide-react';
import FilePicker from '../components/FilePicker';


export default function Documents() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loadingEmbed, setLoadingEmbed] = useState(false);

  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [question, setQuestion] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  const handleEmbed = async () => {
    setLoadingEmbed(true);
    try {
      if (!selectedFile) {
        alert('Please select a file');
        setLoadingEmbed(false);
        return;
      }
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/rag/embed`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(res.data.message);
      setSelectedFile(null);
    } catch (err) {
      alert('Error embedding: ' + err.message);
    }
    setLoadingEmbed(false);
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    const currentQ = question;
    setQuestion('');
    setAnswer('');
    setSources([]);
    setLoadingChat(true);

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/rag/query`, {
        question: currentQ
      });
      setAnswer(res.data.answer);
      setSources(res.data.sources || []);
    } catch (err) {
      setAnswer('Error: ' + err.message);
    }
    setLoadingChat(false);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Documents</h2>
        <p>Embed text and PDF files and chat with an LLM about their content.</p>
      </div>

      <div className="card glass">
        <h3>Upload Document</h3>
        <div className="form-group">
          <label>File</label>
          <FilePicker
            value={selectedFile}
            onChange={setSelectedFile}
            placeholder="Select a text or PDF file..."
            selectType="file"
            accept=".txt,.pdf"
          />
        </div>
        <button onClick={handleEmbed} disabled={loadingEmbed}>
          <FileUp size={18} /> {loadingEmbed ? 'Embedding...' : 'Embed Document'}
        </button>
      </div>

      <div className="card glass">
        <h3>Ask Question</h3>
        <div className="chat-input" style={{ borderTop: 'none', padding: 0 }}>
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAsk()}
            placeholder="Ask a question about the embedded documents..."
          />
          <button onClick={handleAsk} disabled={loadingChat}>
            <Send size={18} />
          </button>
        </div>
      </div>

      {answer && (
        <div className="card glass chat-container">
          <h3>Answer</h3>
          <div className="chat-messages">
            <div className="message bot">
              {answer}
              {sources.length > 0 && (
                <details style={{ marginTop: '10px', fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                  <summary style={{ cursor: 'pointer' }}>View Sources ({sources.length})</summary>
                  <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                    {sources.map((s, idx) => (
                      <li key={idx}><strong>{s.file}</strong>: {s.paragraph.substring(0, 100)}...</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
