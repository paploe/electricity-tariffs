from fastapi import FastAPI
from fastapi.openapi.docs import get_swagger_ui_html

# Initialize FastAPI app
app = FastAPI()

status_dict = {
    "scrap_file": False,
    "download_file": False,
    "extract_data": False,
    "harmonize_data_1": False,
    "harmonize_data_2": False,
    "harmonize_data_3": False,
    "harmonize_data_4": False,
    "harmonize_data_5": False,
    "harmonize_data_6": False,
    "finalize_data": False
}


# Define FastAPI endpoints
@app.get("/")
async def get_status():
    return status_dict


@app.post("/set_status/")
async def set_status(data: dict):
    assert isinstance(data, dict)
    status_dict.update(data)


@app.get("/docs")
def read_docs():
    return get_swagger_ui_html(openapi_url="/openapi.json")