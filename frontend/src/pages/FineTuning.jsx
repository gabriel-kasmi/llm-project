import React, { useState } from 'react';
import axios from 'axios';
import { Settings, Play } from 'lucide-react';
import FilePicker from '../components/FilePicker';

export default function FineTuning() {
  const [dbtProject, setDbtProject] = useState('');
  const [fineTuningData, setFineTuningData] = useState('');
  const [bucketName, setBucketName] = useState('');
  const [modelName, setModelName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!dbtProject || !fineTuningData) return alert('Select dbt and data folders');
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/fine_tuning/generate`, null, {
        params: { dbt_project_path: dbtProject, fine_tuning_data_path: fineTuningData }
      });
      alert(res.data.status + ': ' + res.data.file);
    } catch (err) {
      alert('Error generating data: ' + err.message);
    }
    setLoading(false);
  };

  const handleTrain = async () => {
    if (!dbtProject || !fineTuningData || !bucketName || !modelName) return alert('Fill all fields');
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/fine_tuning/train`, {
        dbt_project_path: dbtProject,
        fine_tuning_data_path: fineTuningData,
        bucket_name: bucketName,
        model_display_name: modelName
      });
      alert('Job started: ' + res.data.job_name);
    } catch (err) {
      alert('Error starting training: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Fine Tune</h2>
        <p>Prepare training data and fine-tune Gemini models on your data.</p>
      </div>

      <div className="card glass">
        <h3>1. Prepare Data</h3>
        <div className="form-group">
          <label>dbt Project Path</label>
          <FilePicker value={dbtProject} onChange={setDbtProject} selectType="directory" />
        </div>
        <div className="form-group">
          <label>Fine Tuning Data Path</label>
          <FilePicker value={fineTuningData} onChange={setFineTuningData} selectType="directory" />
        </div>
        <button onClick={handleGenerate} disabled={loading}>
          <Settings size={18} /> Generate JSONL
        </button>
      </div>

      <div className="card glass">
        <h3>2. Start Training</h3>
        <div className="form-group">
          <label>GCS Bucket Name</label>
          <input value={bucketName} onChange={e => setBucketName(e.target.value)} placeholder="e.g. my-bucket" />
        </div>
        <div className="form-group">
          <label>Model Display Name</label>
          <input value={modelName} onChange={e => setModelName(e.target.value)} placeholder="e.g. celinia-v2" />
        </div>
        <button onClick={handleTrain} disabled={loading}>
          <Play size={18} /> Start Training
        </button>
      </div>
    </div>
  );
}
