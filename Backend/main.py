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
import unetpp

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

def unetpp_funding_model_predict(input_data: AnalysisInput, image: list) -> str:
    """Use UNet++ model to predict funding round from generated image."""
    try:
        # Get the image file path from the create_image return value
        image_path = f"./image/{image[1]}"  # image[1] contains the filename
        
        # Run prediction using the UNet++ model
        prediction_index = unetpp.predict(image_path)
        
        # Convert prediction index to funding round label
        label_map = {'angel': 0, 'seed': 1, 'a': 2, 'b': 3, 'c': 4}
        reverse_label_map = {v: k for k, v in label_map.items()}
        funding_round = reverse_label_map.get(prediction_index, "unknown")
        
        # Format the output message
        if funding_round == "angel":
            return "Angel Investment"
        elif funding_round == "seed":
            return "Seed Funding"
        elif funding_round == "a":
            return "Series A"
        elif funding_round == "b":
            return "Series B" 
        elif funding_round == "c":
            return "Series C"
        else:
            return "Unknown Funding Round"
            
    except Exception as e:
        print(f"Error in model prediction: {e}")
        return "Prediction Error - Using default Series A"

def create_image(position: str, education: str, number: int, is_first: bool, is_last: bool) -> list:
    # Set up image parameters
    bar_height = 50
    row_spacing = 10
    scale_factor = 40  # scale for bar width

    # Prepare data for one row (simulate a group)
    fields = [
        ("Position", "Position_pixel"),
        ("Education", "Education_pixel"),
        ("Investors", "Investors_pixel"),
        ("First", "First_pixel"),
        ("Last", "Last_pixel"),
    ]
    # Assign deeper colors for each field
    color_map = {
        "Position": (255, 140, 0),   # dark orange
        "Education": (165, 42, 42), # brownish red
        "Investors": (0, 100, 0), # darker green
        "First": (128, 0, 128),      # purple
        "Last": (255, 105, 180),     # pink
    }
    # Prepare bar data
    bar = []
    # Education
    bar.append((color_map["Education"], (len(education) + 1) * scale_factor))
    # Position
    bar.append((color_map["Position"], (len(position) + 1) * scale_factor))
    # Last
    bar.append((color_map["Last"], (2 if is_last else 1) * scale_factor))
    # Investors
    bar.append((color_map["Investors"], (number + 1) * scale_factor))
    # First
    bar.append((color_map["First"], (2 if is_first else 1) * scale_factor))


    # Calculate image size
    img_width = sum(pixel for _, pixel in bar) if bar else 400
    img_height = bar_height + row_spacing
    img = Image.new("RGB", (img_width, img_height), "white")

    # Draw the bar
    x = 0
    for color, pixel in bar:
        for dx in range(pixel):
            for dy in range(bar_height):
                img.putpixel((x + dx, dy + row_spacing // 2), color)
        x += pixel

    # Save image with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    image_name = f"image_{timestamp}.png"
    img.save(f"./image/{image_name}", format="PNG")

    # Convert the image to base64
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()

    return_image = [f"data:image/png;base64,{img_str}", image_name]
    return return_image

@app.post("/analyze")
async def analyze_data(data: AnalysisInput):
    # Generate a sample image based on the inputs
    image = create_image(
        data.Position,
        data.Education,
        data.Number_of_Investor,
        data.IsFirst,
        data.IsLast
    )

    # Use the UNet++ model to predict the funding round
    message = unetpp_funding_model_predict(data, image)

    # Create analysis output
    output = AnalysisOutput(
        image=image[0],
        message=message,
        timestamp=datetime.now().isoformat(),
        input_data=data
    )

    # Save the analysis
    save_analysis(output)

    return {
        "image": image[0],
        "message": message
    }

@app.get("/history")
async def get_analysis_history():
    stored = load_stored_analyses()
    # Return analyses in reverse chronological order
    return list(reversed(stored.analyses))