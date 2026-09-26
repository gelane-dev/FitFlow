import cloudinary
import cloudinary.uploader
from app.core.config import (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)

cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET
)

def upload_imagem(arquivo):
    
    resultado = cloudinary.uploader.upload(arquivo.file)

    url = resultado["secure_url"]
    public_id = resultado["public_id"]

    return url, public_id

def upload_video(arquivo):
    
    resultado = cloudinary.uploader.upload(arquivo.file, resource_type="video")

    url = resultado["secure_url"]
    id_video = resultado["public_id"]
    
    return url, id_video

def deletar_imagem(public_id):

    resultado = cloudinary.uploader.destroy(public_id, resource_type="image")

    return resultado

def deletar_video(public_id):

    resultado = cloudinary.uploader.destroy(public_id, resource_type="video")

    return resultado

