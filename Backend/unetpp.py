# Imports
import os
import pandas as pd
import numpy as np
import cv2
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import matplotlib.pyplot as plt
from tqdm import tqdm
import albumentations as A
from albumentations.pytorch import ToTensorV2

# Use GPU if available
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# paths
model_path = "./Model/unetpp_funding_model.pt"
image_dir = "./image/"

# Load label
label_map = {'angel': 0, 'seed': 1, 'a': 2, 'b': 3, 'c': 4}

# Dataset class
class FundingDataset(Dataset):
    def __init__(self, df, image_dir, label_map, size=(256, 256)):
        self.df = df.reset_index(drop=True)
        self.image_dir = image_dir
        self.label_map = label_map
        self.size = size
        self.transform = A.Compose([
            A.PadIfNeeded(min_height=size[0], min_width=size[1], border_mode=cv2.BORDER_CONSTANT, pad_value=255),
            A.Resize(size[0], size[1]),
            A.Normalize(mean=(0.5,), std=(0.5,)),
            ToTensorV2()
        ])

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img_path = os.path.join(image_dir, row['filename'])
        image = cv2.imread(img_path)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image = self.transform(image=image)['image']
        label = self.label_map[row['label']]
        return image, label

class ConvBlock(nn.Module):
    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, 3, padding=1),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True)
        )
    def forward(self, x):
        return self.block(x)

class UNetPPClassifier(nn.Module):
    def __init__(self, in_ch=3, base_ch=32, num_classes=5):
        super().__init__()
        self.conv00 = ConvBlock(in_ch, base_ch)
        self.pool = nn.MaxPool2d(2)
        self.conv10 = ConvBlock(base_ch, base_ch*2)
        self.conv20 = ConvBlock(base_ch*2, base_ch*4)
        self.up01 = ConvBlock(base_ch + base_ch*2, base_ch)
        self.up11 = ConvBlock(base_ch*2 + base_ch*4, base_ch*2)
        self.global_pool = nn.AdaptiveAvgPool2d((1,1))
        self.fc = nn.Linear(base_ch, num_classes)

    def forward(self, x):
        x00 = self.conv00(x)
        x10 = self.conv10(self.pool(x00))
        x20 = self.conv20(self.pool(x10))
        x01 = self.up01(torch.cat([x00, F.interpolate(x10, scale_factor=2, mode='bilinear', align_corners=True)], dim=1))
        x11 = self.up11(torch.cat([x10, F.interpolate(x20, scale_factor=2, mode='bilinear', align_corners=True)], dim=1))
        out = self.global_pool(x01).view(x01.size(0), -1)
        return self.fc(out)

# Initialize model as None - will be loaded when needed
model = None

def load_model():
    """Load the UNet++ model if not already loaded."""
    global model
    if model is None:
        try:
            model = UNetPPClassifier().to(device)
            model.load_state_dict(torch.load(model_path, map_location=device))
            model.eval()
            print("Model loaded successfully")
        except Exception as e:
            print(f"Error loading model: {e}")
            raise e
    return model

def predict(image_path):
    """Run prediction on a single image."""
    # Load model if not already loaded
    current_model = load_model()
    
    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError(f"Image not found or cannot be read: {image_path}")
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    transform = A.Compose([
        A.PadIfNeeded(min_height=256, min_width=256, border_mode=cv2.BORDER_CONSTANT, value=255),
        A.Resize(256, 256),
        A.Normalize(mean=(0.5,), std=(0.5,)),
        ToTensorV2()
    ])
    image = transform(image=image)['image'].unsqueeze(0).to(device)
    with torch.no_grad():
        logits = current_model(image)
        prediction = logits.argmax(1).item()
    return prediction

if __name__ == "__main__":
    test_image_path = "./image/test_image.png"  # Updated test image path
    prediction = predict(test_image_path)
    print(f"Predicted label: {list(label_map.keys())[prediction]}")
