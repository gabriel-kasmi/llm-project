from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google.oauth2 import service_account
from vertexai import init as vertexai_init
from vertexai.generative_models import GenerativeModel
from typing import List, Dict, Any
from datetime import date, datetime
from google.cloud import bigquery
import json
import os
import re


router = APIRouter()

GCP_KEY_PATH = os.environ.get("GCP_KEY_PATH")
GENERATIVE_MODEL_NAME = os.environ.get("GENERATIVE_MODEL_NAME")

credentials = service_account.Credentials.from_service_account_file(GCP_KEY_PATH)
vertexai_init(credentials=credentials, project=credentials.project_id, location="europe-west1")
model = GenerativeModel(GENERATIVE_MODEL_NAME)
bq_client = bigquery.Client(credentials=credentials)


class QueryRequest(BaseModel):
    dataset: str
    dataset_schema: List[Dict[str, Any]]
    data_sample: List[Dict[str, Any]]
    question: str


class FetchSchemaRequest(BaseModel):
    dataset: str


@router.post("/fetch_schema")
def fetch_schema(req: FetchSchemaRequest):
    query = f"""
        SELECT
            table_name,
            column_name,
            data_type
        FROM {req.dataset}.INFORMATION_SCHEMA.COLUMNS
        ORDER BY
            table_name,
            ordinal_position;
    """
    try:
        query_job = bq_client.query(query)
        results = query_job.result()
        tables = set()
        dataset_schema = []
        for row in results:
            dataset_schema.append(dict(row))
            tables.add(row["table_name"])

        data_sample = []
        for table in tables:
            q = f"SELECT * FROM `{req.dataset}.{table}` limit 2"
            q_job = bq_client.query(q)
            results = q_job.result()

            data = []
            for row in results:
                row_dict = dict(row)
                for k, v in row_dict.items():
                    if isinstance(v, (datetime, date)):
                        row_dict[k] = v.isoformat()
                data.append(row_dict)

            element = {"table_name": table, "data": data}
            data_sample.append(element)

        return {"dataset_schema": dataset_schema, "data_sample": data_sample}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query")
def query(req: QueryRequest):
    prompt = f"""
        You are an expert SQL query generator. Given a natural language question, translate it into a SQL query.
        You should use the schema of tables and columns included below.
        Don't hesitate to use CTEs for clarity and efficiency, especially for questions involving multiple tables.
        Make sure to only output select queries using BigQuery SQL.
        Make sure to include the dataset name ({req.dataset}) in your output query.
        Make sure to name all the columns in your output query.
        If you can't find the relevant columns, just say it, don't invent them.
        Don't include the project-id or any backticks in your output query.
        Always put the grouped by columns first in the query.

        Return the result as a formatted SQL query.

        DATASET SCHEMA: '{json.dumps(req.dataset_schema)}'

        DATA SAMPLE: '{json.dumps(req.data_sample)}'

        USER QUESTION: '{req.question}'

        RESPONSE (SQL ONLY):
    """
    try:
        response = model.generate_content(prompt)
        query = response.text
        query = query.replace('`', '').replace('sql', '').replace('bigquery', '')
        return {"query": query}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execute_sql_query")
def execute_sql_query(query: str, dataset: str = None):
    # Only allow SELECT queries
    cleaned_query = query.strip().lower()
    if not cleaned_query.startswith("select"):
        raise HTTPException(status_code=400, detail="Only SELECT queries are allowed")

    # Prevent multiple statements (basic SQL injection protection)
    if ";" in query.rstrip(";"):
        raise HTTPException(status_code=400, detail="Multiple statements are not allowed")

    # If dataset is provided, validate query only accesses allowed dataset
    if dataset:
        # Extract table references and check they belong to the allowed dataset
        table_pattern = re.compile(r'(?:from|join)\s+([a-zA-Z0-9_\.]+)', re.IGNORECASE)
        matches = table_pattern.findall(query)
        for table_ref in matches:
            # Strip backticks if present
            table_ref = table_ref.replace("`", "")
            parts = table_ref.split(".")
            if len(parts) >= 2:
                query_dataset = parts[-2]
            else:
                query_dataset = None
            if query_dataset and query_dataset != dataset:
                raise HTTPException(status_code=403, detail=f"Query accesses dataset '{query_dataset}' which is not allowed")

    try:
        query_job = bq_client.query(query)
        results = query_job.result()
        rows = []
        for row in results:
            row_dict = dict(row)
            for k, v in row_dict.items():
                if isinstance(v, (datetime, date)):
                    row_dict[k] = v.isoformat()
            rows.append(row_dict)
        return {"results": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
