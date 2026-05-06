from fastapi import APIRouter
from pydantic import BaseModel
from google.oauth2 import service_account
from google.cloud import storage
from google.cloud import bigquery
from vertexai.tuning import sft
from vertexai import init as vertexai_init
import json
import os


router = APIRouter()

GCP_KEY_PATH = os.environ.get("GCP_KEY_PATH")
GENERATIVE_MODEL_NAME = os.environ.get("GENERATIVE_MODEL_NAME")

credentials = service_account.Credentials.from_service_account_file(GCP_KEY_PATH)
vertexai_init(credentials=credentials, project=credentials.project_id, location="europe-west1")
storage_client = storage.Client(credentials=credentials, project=credentials.project_id)
bq_client = bigquery.Client(credentials=credentials)


class FineTuneRequest(BaseModel):
    dbt_project_path: str
    dataset: str
    fine_tuning_data_path: str
    bucket_name: str
    model_display_name: str


class GenerateJsonlRequest(BaseModel):
    dbt_project_path: str
    dataset: str
    fine_tuning_data_path: str


def fetch_schema(dataset):
    query = f"""
        SELECT
            table_name,
            column_name,
            data_type
        FROM {dataset}.INFORMATION_SCHEMA.COLUMNS
        ORDER BY
            table_name,
            ordinal_position;
    """
    query_job = bq_client.query(query)
    results = query_job.result()
    dataset_schema = []
    for row in results:
        dataset_schema.append(dict(row))

    return dataset_schema


def make_prompt(question, dataset_schema, semantic_layer):
    return f"""You are an expert Lightdash Semantic Layer assistant.
Dataset Schema: {dataset_schema}
Semantic Layer: {semantic_layer}
User Question: {question}
Answer:"""


def fill_template(prompt, answer):
    return {
        "contents": [
            {"role": "user", "parts": [{"text": prompt}]},
            {"role": "model", "parts": [{"text": answer}]}
        ]
    }


@router.post("/generate")
def generate_jsonl(req: GenerateJsonlRequest):
    dataset_schema = fetch_schema(req.dataset)
    dataset_schema = json.dumps(dataset_schema)
    folder_name = req.fine_tuning_data_path
    training_data_file = "train_data.jsonl"

    semantic_layer = ""
    models_dir = os.path.join(req.dbt_project_path, "models")
    if os.path.exists(models_dir):
        for file in os.listdir(models_dir):
            if file.endswith(".yml") or file.endswith(".yaml"):
                with open(os.path.join(models_dir, file), 'r', encoding='utf-8') as f:
                    semantic_layer += f.read() + "\n"

    with open(training_data_file, 'w', encoding='utf-8') as json_file:
        if os.path.exists(folder_name):
            for directory in os.listdir(folder_name):
                dir_path = os.path.join(folder_name, directory)
                if not os.path.isdir(dir_path): continue
                for example in os.listdir(dir_path):
                    with open(os.path.join(dir_path, example), 'r', encoding='utf-8') as file:
                        content = file.read().strip()
                    if "=====" in content:
                        question, answer = content.split("=====")
                        prompt = make_prompt(question, dataset_schema, semantic_layer)
                        template = fill_template(prompt, answer.strip())
                        json_file.write(json.dumps(template) + "\n")
    return {"status": "success", "file": training_data_file}


@router.post("/train")
def train(req: FineTuneRequest):
    training_data_file = "train_data.jsonl"

    bucket = storage_client.bucket(req.bucket_name)
    blob = bucket.blob(training_data_file)
    blob.upload_from_filename(training_data_file)

    tuning_job = sft.train(
        source_model=GENERATIVE_MODEL_NAME,
        train_dataset=f"gs://{req.bucket_name}/{training_data_file}",
        tuned_model_display_name=req.model_display_name
    )

    return {"status": "started", "job_name": tuning_job.resource_name}
