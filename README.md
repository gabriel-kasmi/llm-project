# AI Assistant

A full-stack AI Assistant application that provides multiple LLM-powered tools for data analysis, document querying, and model fine-tuning. Built with FastAPI, React, and Google Vertex AI (Gemini).

## Features

### SQL Agent
- Connect to Google BigQuery datasets
- Fetch dataset schemas and data samples
- Translate natural language questions into SQL queries using Gemini
- Execute SELECT queries with built-in safety validation

### RAG Agent
- Embed documents (PDF, TXT) into a PostgreSQL vector database
- Embed web pages by scraping and parsing HTML content
- Answer questions using semantic similarity search
- Provide source citations for all answers
- Powered by Google's `text-embedding-005` model

### Semantic Layer Agent
- Analyze dbt project YAML files with Lightdash meta tags
- Identify relevant metrics, dimensions, and filters from natural language questions
- Visualize proposed changes with diff views

### Fine Tuning Agent
- Generate JSONL training data from question-answer pairs
- Combine dbt schema, semantic layer definitions, and training examples
- Upload training data to Google Cloud Storage
- Trigger supervised fine-tuning (SFT) of Gemini models via Vertex AI

### Files Agent
- Browse and list directory contents on the server

## Tech Stack

**Backend**
- FastAPI + Uvicorn
- Google Vertex AI / Gemini
- Google Cloud BigQuery & Storage
- PostgreSQL with pgvector
- Pydantic, Pandas, PyMuPDF, BeautifulSoup4

**Frontend**
- React 19 + Vite
- React Router DOM
- Axios, Lucide React, React Diff Viewer

**Infrastructure**
- Docker (PostgreSQL, Lightdash)
- Makefile orchestration

## Prerequisites

- Python 3.11+
- Node.js / npm
- Docker
- Google Cloud Platform service account credentials
- A BigQuery dataset

## Setup

### 1. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- Database credentials
- GCP project ID and service account key path
- Model names
- BigQuery dataset configuration

### 2. Backend

```bash
cd backend
uv sync
```

### 3. Frontend

```bash
npm install --prefix frontend
```

### 4. Infrastructure (Optional)

```bash
make run-postgres        # Start PostgreSQL with pgvector
make activate-pgvector   # Enable the pgvector extension
make run-lightdash       # Start Lightdash for BI visualization
```

## Running the Application

```bash
# Start backend
make run-backend

# Start frontend (in a separate terminal)
make run-frontend
```

### Default Ports

| Service     | Port |
|-------------|------|
| Frontend    | 3000 |
| Backend API | 8000 |
| PostgreSQL  | 5432 |
| Lightdash   | 8080 |

## Project Structure

```
├── backend/
│   ├── main.py                 # FastAPI entry point
│   ├── agents/
│   │   ├── sql_agent.py        # BigQuery SQL generation
│   │   ├── rag_agent.py        # Document embedding & RAG
│   │   ├── semantic_layer_agent.py  # dbt/Lightdash analysis
│   │   ├── fine_tuning_agent.py    # Training data & SFT
│   │   └── files.py            # File browsing
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main app with routing
│   │   ├── components/
│   │   └── pages/              # Feature page components
│   └── vite.config.js
├── data/
│   ├── rag/                    # Sample documents
│   └── fine-tuning/            # Training data by topic
├── Makefile
└── .env.example
```

## Fine-Tuning Data Format

Training examples use the format:

```
question ===== answer
```

These are converted to Vertex AI SFT JSONL format automatically by the Fine Tuning Agent. Organize training data under `data/fine-tuning/` by topic category.

## Cleanup

Remove all build artifacts, caches, and dependencies:

```bash
make clean
```
