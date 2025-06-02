from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
from PIL import Image, ImageDraw
import io
import json
from datetime import datetime
import os
from typing import List, Optional

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalysisInput(BaseModel):
    Position: str
    Education: str
    Number_of_Investor: int
    IsFirst: bool
    IsLast: bool

class AnalysisOutput(BaseModel):
    image: str
    message: str
    timestamp: str
    input_data: AnalysisInput

class StoredAnalysis(BaseModel):
    analyses: List[AnalysisOutput] = []

# File path for storing analysis results
STORAGE_FILE = "analysis_history.json"

def load_stored_analyses() -> StoredAnalysis:
    try:
        if os.path.exists(STORAGE_FILE):
            with open(STORAGE_FILE, "r") as f:
                data = json.load(f)
                return StoredAnalysis(**data)
    except Exception as e:
        print(f"Error loading stored analyses: {e}")
    return StoredAnalysis()

def save_analysis(analysis: AnalysisOutput):
    stored = load_stored_analyses()
    stored.analyses.append(analysis)
    try:
        with open(STORAGE_FILE, "w") as f:
            json.dump(stored.dict(), f, indent=2)
    except Exception as e:
        print(f"Error saving analysis: {e}")

def create_sample_image(position: str, education: str, number: int, is_first: bool, is_last: bool) -> str:
    # Create a simple image based on the inputs
    img = Image.new('RGB', (400, 200), color='white')
    draw = ImageDraw.Draw(img)
    
    # Draw some text and shapes based on the inputs
    draw.text((10, 10), f"Position: {position}", fill='black')
    draw.text((10, 30), f"Education: {education}", fill='black')
    draw.text((10, 50), f"Investors: {number}", fill='black')
    draw.text((10, 70), f"First Round: {is_first}", fill='black')
    draw.text((10, 90), f"Last Round: {is_last}", fill='black')
    
    # Draw a rectangle if it's first round
    if is_first:
        draw.rectangle([50, 100, 150, 150], outline='blue')
    
    # Draw a circle if it's last round
    if is_last:
        draw.ellipse([200, 100, 250, 150], outline='red')
    
    # Convert the image to base64
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return f"data:image/png;base64,{img_str}"

@app.post("/analyze")
async def analyze_data(data: AnalysisInput):
    # Generate a sample image based on the inputs
    image = create_sample_image(
        data.Position,
        data.Education,
        data.Number_of_Investor,
        data.IsFirst,
        data.IsLast
    )
    
    # Create a sample message
    message = f"Analysis complete! Position '{data.Position}' has {data.Number_of_Investor} investors."
    if data.IsFirst:
        message += " This is the first investment round."
    elif data.IsLast:
        message += " This is the last investment round."
    else:
        message += " This is an intermediate investment round."
    
    # Create analysis output
    output = AnalysisOutput(
        image=image,
        message=message,
        timestamp=datetime.now().isoformat(),
        input_data=data
    )
    
    # Save the analysis
    save_analysis(output)
    
    return {
        "image": image,
        "message": message
    }

@app.get("/history")
async def get_analysis_history():
    stored = load_stored_analyses()
    # Return analyses in reverse chronological order
    return list(reversed(stored.analyses))