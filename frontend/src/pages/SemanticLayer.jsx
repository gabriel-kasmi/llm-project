import React, { useState } from 'react';
import axios from 'axios';
import { Send, Copy } from 'lucide-react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import FilePicker from '../components/FilePicker';

export default function SemanticLayer() {
  const [dbtProjectFiles, setDbtProjectFiles] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [question, setQuestion] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  const handleAsk = async () => {
    if (!question.trim()) return;
    if (!dbtProjectFiles || dbtProjectFiles.length === 0) {
      alert('Please select a dbt project directory first');
      return;
    }

    const currentQ = question;
    setQuestion('');
    setResult(null);
    setCopied(false);
    setLoadingChat(true);

    try {
      const selectedFiles = Array.from(dbtProjectFiles).filter((file) => {
        const ext = file.name.split('.').pop().toLowerCase();
        return ['yml', 'yaml'].includes(ext);
      });

      const filesContent = await Promise.all(
        selectedFiles.map((file) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ name: file.webkitRelativePath || file.name, content: reader.result });
            reader.readAsText(file);
          });
        })
      );

      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/semantic_layer/query`, {
        question: currentQ,
        files: filesContent
      });
      setResult(res.data);
    } catch (err) {
      setResult({ type: 'error', bot: 'Error: ' + err.message });
    }
    setLoadingChat(false);
  };

  const handleCopyContent = async () => {
    if (!result || result.found) return;

    try {
      await navigator.clipboard.writeText(result.new_content);
      setCopied(true);
    } catch (err) {
      alert('Error copying to clipboard: ' + err.message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Semantic Layer</h2>
        <p>Ask questions about your Lightdash project.</p>
      </div>

      <div className="card glass">
        <h3>Configuration</h3>
        <div className="form-group">
          <label>dbt Project Directory</label>
          <FilePicker
            value={dbtProjectFiles}
            onChange={setDbtProjectFiles}
            placeholder="e.g. /org/dbt_project"
            selectType="directory"
          />
        </div>
      </div>

      <div className="card glass">
        <h3>Ask Question</h3>
        <div className="chat-input" style={{ borderTop: 'none', padding: 0 }}>
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAsk()}
            placeholder="e.g. How many users signed up last month?"
          />
          <button onClick={handleAsk} disabled={loadingChat}>
            <Send size={18} />
          </button>
        </div>
      </div>

      {result && (
        <div className="card glass chat-container">
          <h3>Result</h3>
          <div className="chat-messages">
            <div className="message bot" style={{ maxWidth: result.found === false ? '100%' : '80%' }}>
              {result.type === 'error' && result.bot}
              {result.found === true && (
                <div>
                  <p style={{ color: 'var(--success)', fontWeight: 'bold', margin: '0 0 8px 0' }}>✓ Found in existing files</p>
                  <p>{result.location}</p>
                </div>
              )}
              {result.found === false && (
                <div style={{ width: '100%' }}>
                  <p style={{ color: 'var(--warning)', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                    Proposed Change: {result.file_path}
                  </p>
                  <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', color: '#000' }}>
                    <ReactDiffViewer
                      oldValue={result.original_content || ''}
                      newValue={result.new_content}
                      splitView={true}
                      useDarkTheme={false}
                    />
                  </div>
                  <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                    <button
                      onClick={handleCopyContent}
                      disabled={copied}
                      style={{ background: copied ? 'var(--text-secondary)' : 'var(--success)' }}
                    >
                      <Copy size={18} /> {copied ? 'Copied!' : 'Copy Content'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
