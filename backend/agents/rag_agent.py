from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from google.oauth2 import service_account
from vertexai import init as vertexai_init
from vertexai.language_models import TextEmbeddingModel
from vertexai.generative_models import GenerativeModel
from typing import Optional
import os
import re
import time
import psycopg2
from pgvector.psycopg2 import register_vector
import fitz
import requests
from bs4 import BeautifulSoup


router = APIRouter()

DB_URL = os.environ.get("DATABASE_URL")
GCP_KEY_PATH = os.environ.get("GCP_KEY_PATH")
EMBEDDING_MODEL_NAME = os.environ.get("EMBEDDING_MODEL_NAME")
GENERATIVE_MODEL_NAME = os.environ.get("GENERATIVE_MODEL_NAME")

credentials = service_account.Credentials.from_service_account_file(GCP_KEY_PATH)
vertexai_init(credentials=credentials, project=credentials.project_id, location="europe-west1")
embedding_model = TextEmbeddingModel.from_pretrained(EMBEDDING_MODEL_NAME)
generative_model = GenerativeModel(GENERATIVE_MODEL_NAME)


class QueryRequest(BaseModel):
    question: str


def store_embeddings(referenced_embeddings):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    conn.commit()
    register_vector(conn)
    query = """
        CREATE TABLE IF NOT EXISTS documents (
            id SERIAL PRIMARY KEY,
            file TEXT,
            paragraph TEXT,
            embedding VECTOR(768)
        );
    """
    cursor.execute(query)
    conn.commit()
    for item in referenced_embeddings:
        file = item["file"]
        paragraph = item["paragraph"]
        embedding = item["embedding"]
        cursor.execute(
            """
            INSERT INTO documents (file, paragraph, embedding)
            VALUES (%s, %s, %s)
            """, (file, paragraph, embedding)
        )
    conn.commit()
    cursor.close()
    conn.close()


def embed_paragraphs(files, paragraphs):
    referenced_embeddings = []
    nb_paragraphs = len(paragraphs)
    step = 20
    for batch_start in range(0, nb_paragraphs, step):
        batch_end = min(batch_start + step, nb_paragraphs)
        batch_paragraphs = paragraphs[batch_start:batch_end]
        time.sleep(0.75)
        response = embedding_model.get_embeddings(batch_paragraphs)
        for index in range(len(batch_paragraphs)):
            referenced_embeddings.append({
                "file": files[batch_start + index],
                "paragraph": batch_paragraphs[index],
                "embedding": response[index].values
            })
    return referenced_embeddings


def process_text_content(content: str, source_name: str):
    files = []
    paragraphs = []
    content_paragraphs = re.split(r'\n\s*\n+', content.strip())
    for paragraph in content_paragraphs:
        paragraph = paragraph.strip()
        if paragraph == "":
            continue
        files.append(source_name)
        paragraphs.append(paragraph)
    return files, paragraphs


def html_to_text_lines(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "template", "svg", "canvas", "aside"]):
        tag.decompose()
    for br in soup.find_all("br"):
        br.replace_with("\n")
    block_tags = ("h1","h2","h3","h4","h5","h6","p","li","pre","blockquote","td","th","dt","dd")
    lines = []
    for el in soup.find_all(block_tags):
        if el.find_parent("li") and el.name != "li":
            continue
        if el.find_parent(["table","thead","tbody","tfoot","tr"]) and el.name not in ("td","th"):
            continue
        line = " ".join(chunk.strip() for chunk in el.stripped_strings)
        if line:
            lines.append(line)
    if not lines:
        return " ".join(soup.stripped_strings)
    deduped = []
    prev = None
    for line in lines:
        if line != prev:
            deduped.append(line)
        prev = line
    text = "\n".join(deduped)
    text = re.sub(r"[ \tag]*\n[ \tag]*", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


@router.post("/embed")
async def embed_data(
    url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    files = []
    paragraphs = []
    source_name = ""

    if file:
        content = await file.read()
        source_name = file.filename
        ext = source_name.lower().split('.')[-1]
        if ext == "pdf":
            try:
                with fitz.open(stream=content, filetype="pdf") as doc:
                    text = ""
                    for page in doc:
                        text += page.get_text()
                f_list, p_list = process_text_content(text, source_name)
                files.extend(f_list)
                paragraphs.extend(p_list)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to read pdf: {str(e)}")
        elif ext == "txt":
            try:
                text_content = content.decode("utf-8")
                f_list, p_list = process_text_content(text_content, source_name)
                files.extend(f_list)
                paragraphs.extend(p_list)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: .{ext}. Only .pdf and .txt are supported.")
    elif url:
        if not url.startswith(("http://", "https://")):
            raise HTTPException(status_code=400, detail="URL must start with http:// or https://")
        source_name = url
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            response = requests.get(url, timeout=15, headers=headers)
            response.raise_for_status()
            text_content = html_to_text_lines(response.text)
            f_list, p_list = process_text_content(text_content, url)
            files.extend(f_list)
            paragraphs.extend(p_list)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch or parse URL: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Either file or url must be provided")

    if not paragraphs:
        return {"status": "error", "message": "No content found to embed."}

    try:
        referenced_embeddings = embed_paragraphs(files, paragraphs)
        store_embeddings(referenced_embeddings)
        return {"status": "success", "message": f"Successfully embedded {len(paragraphs)} paragraphs from {source_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to embed and store: {str(e)}")


@router.post("/query")
def query_rag(req: QueryRequest):
    try:
        query_embedding = embedding_model.get_embeddings([req.question])[0].values

        conn = psycopg2.connect(DB_URL)
        register_vector(conn)
        cursor = conn.cursor()

        # Check if table exists
        cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documents');")
        if not cursor.fetchone()[0]:
            return {"answer": "No documents embedded yet.", "sources": []}

        query = f"""
            SELECT file, paragraph
            FROM documents
            ORDER BY embedding <-> '{query_embedding}'
            LIMIT 10
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        files = []
        paragraphs = []
        for row in rows:
            files.append(row[0])
            paragraphs.append(row[1])

        relevant_passage = "".join(paragraphs)

        prompt = f"""
            You are a helpful and informative assistant that answers questions using the text from the reference passage below.
            Make sure to respond in complete sentences, thoroughly and concisely, including all relevant context information.
            Take time to explain complex concepts and adopt a friendly, conversational tone.
            If the passage is not relevant to the answer, you may ignore it.
            
            PASSAGE: '{relevant_passage}'

            USER QUESTION: '{req.question}'
            
            RESPONSE:
        """

        response = generative_model.generate_content(prompt)
        answer = response.text

        sources = [{"file": file, "paragraph": paragraph} for file, paragraph in zip(files, paragraphs)]

        return {"answer": answer, "sources": sources}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
