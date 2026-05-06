import React, { useState } from 'react';
import axios from 'axios';
import { Send, Database as DbIcon, Play } from 'lucide-react';
import FilePicker from '../components/FilePicker';

export default function Sql() {
  const [dataset, setDataset] = useState('');
  const [DatasetSchema, setDatasetSchema] = useState(null);
  const [DataSample, setDataSample] = useState(null);
  const [question, setQuestion] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSchema = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/sql/fetch_schema`, null, {
        params: { dataset }
      });
      setDatasetSchema(res.data.dataset_schema);
      setDataSample(res.data.data_sample);
      alert('Schema fetched successfully!');
    } catch (err) {
      alert('Error fetching schema: ' + err.message);
    }
    setLoading(false);
  };

  const generateQuery = async () => {
    if (!DatasetSchema) return alert('Fetch schema first!');
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/sql/query`, {
        dataset,
        dataset_schema: DatasetSchema,
        data_sample: DataSample,
        question
      });
      setQuery(res.data.query);
    } catch (err) {
      alert('Error generating query: ' + err.message);
    }
    setLoading(false);
  };

  const executeQuery = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/sql/execute_sql_query`, {
        query
      });
      setResults(res.data.results);
    } catch (err) {
      alert('Error executing query: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>SQL</h2>
        <p>Connect to BigQuery and translate natural language to SQL.</p>
      </div>

      <div className="card glass">
        <h3>Configuration</h3>
        <div className="form-group">
          <label>Dataset Name</label>
          <input value={dataset} onChange={e => setDataset(e.target.value)} />
        </div>
        <button onClick={fetchSchema} disabled={loading}>
          <DbIcon size={18} /> {loading ? 'Loading...' : 'Fetch Schema'}
        </button>
      </div>

      <div className="card glass">
        <h3>Ask Question</h3>
        <div className="chat-input" style={{ borderTop: 'none', padding: 0 }}>
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="e.g. How many users signed up last month?"
            onKeyDown={e => e.key === 'Enter' && generateQuery()}
          />
          <button onClick={generateQuery} disabled={loading || !DatasetSchema}>
            <Send size={18} />
          </button>
        </div>
      </div>

      {query && (
        <div className="card glass">
          <h3>Generated SQL</h3>
          <pre><code>{query}</code></pre>
          <button onClick={executeQuery} disabled={loading} style={{ marginTop: '16px' }}>
            <Play size={18} /> Execute Query
          </button>
        </div>
      )}

      {results && (
        <div className="card glass" style={{ overflowX: 'auto' }}>
          <h3>Results</h3>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {Object.keys(results[0] || {}).map(k => (
                  <th key={k} style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((v, j) => (
                    <td key={j} style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>{String(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
