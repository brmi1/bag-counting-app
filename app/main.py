from fastapi import FastAPI, Request, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from datetime import datetime
from uuid import uuid4
from os import path
from typing import Dict
from model import process_video


app = FastAPI()
app.mount('/static', StaticFiles(directory='static'), name='static')

templates = Jinja2Templates(directory='templates')

processing_tasks: Dict[str, int] = {}

@app.get('/')
async def index(request: Request):
    return templates.TemplateResponse('index.html', {'request' : request})


@app.get('/uploads')
async def uploads(request: Request):
    return templates.TemplateResponse('uploads.html', {'request' : request})

@app.post('/uploads-progress')
async def uploads_progress(request: Request):
    file_ids = await request.json()

    completed_files = []

    for file_id in file_ids:
        progress = processing_tasks.get(file_id, 0)

        if progress >= 100:
            processed_size = path.getsize(f'volume/{file_id}.mp4')

            completed_files.append({
                'file_id' : file_id,
                'processed_size' : processed_size
            })

    return { 'completed_files' : completed_files }

@app.post('/upload')
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()

    if len(contents) > 104857600:
        raise HTTPException(status_code=413, detail='Файл превышает допустимый вес')

    elif file.filename.split('.')[-1] != 'mp4':
        raise HTTPException(status_code=415, detail='Неподдерживаемый формат файла')

    timestamp = round(datetime.now().timestamp())
    unique_filename = f'{timestamp}_{uuid4().hex}'

    with open(f'uploads/{unique_filename}.mp4', 'wb') as f:
        f.write(contents)

    return { 'file_id' : unique_filename }


@app.get('/download/{filename}')
async def download_file(filename: str):
    file_path = f'volume/{filename}'

    if not path.exists(file_path):
        raise HTTPException(status_code=404, detail='Файл не найден')

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='application/octet-stream',
        content_disposition_type='attachment'
    )

@app.post('/processing')
async def processing(request: Request, background_tasks: BackgroundTasks):
    data = await request.json()

    file_id = data.get('file_id')
    options = data.get('options')

    processing_tasks[file_id] = 0
    background_tasks.add_task(process_video, processing_tasks, file_id, options)

    return { 'status' : 'started' }

@app.get('/progress/{file_id}')
async def get_progress(file_id: str):
    progress = processing_tasks.get(file_id)
    processed_size = None

    if not progress:
        raise HTTPException(status_code=404, detail='Задача не найдена')

    if progress >= 100:
        processed_size = path.getsize(f'volume/{file_id}.mp4')

    return { 'progress' : progress, 'processed_size' : processed_size }


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('main:app', host='0.0.0.0', port=8000, workers=4, reload=True)
