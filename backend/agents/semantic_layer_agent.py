from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google.oauth2 import service_account
from vertexai import init as vertexai_init
from vertexai.generative_models import GenerativeModel
from typing import List, Dict
import json
import os


router = APIRouter()

GCP_KEY_PATH = os.environ.get("GCP_KEY_PATH")
GENERATIVE_MODEL_NAME = os.environ.get("GENERATIVE_MODEL_NAME")

credentials = service_account.Credentials.from_service_account_file(GCP_KEY_PATH)
vertexai_init(credentials=credentials, project=credentials.project_id, location="europe-west1")
model = GenerativeModel(GENERATIVE_MODEL_NAME)


class QueryRequest(BaseModel):
    files: List[Dict[str, str]]
    question: str


@router.post("/query")
def query_semantic_layer(req: QueryRequest):
    files_str = "\n".join([f"=== FILE: {f['name']} ===\n{f['content']}\n" for f in req.files])

    prompt = f"""
        You are an expert Lightdash semantic layer assistant.
        You are given the contents of dbt project YML files.
        Lightdash derives its semantic layer (metrics, dimensions, filters) from the `meta` tags defined inside dbt YAML files.
        Analyze the provided dbt project files to answer the user's question.
        Your task is to identify which metrics, dimensions, and filters should be used from the Lightdash configuration to answer the question.

        Return the result as a valid JSON object:
        {{
            "metrics": ["metric_name_1", "metric_name_2", ...],
            "dimensions": ["dimension_name_1", "dimension_name_2", ...],
            "filters": ["filter_clause_1", "filter_clause_2", ...]
        }}

        PROJECT FILES (dbt YML with meta tags): '{files_str}'

        USER QUESTION: '{req.question}'

        RESPONSE (JSON ONLY):
    """

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        result = json.loads(text)
        return result
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="The AI did not return a valid JSON format.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
