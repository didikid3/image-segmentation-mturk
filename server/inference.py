import os
import json
from ultralytics import YOLO
from PIL import Image

# ✅ Load YOLOv8 segmentation model
model = YOLO("yolov8n-seg.pt")

# ✅ Path to public folder and output JSON
public_folder = "public"
output_json = "detections.json"

# ✅ Get all images in the folder
image_files = [f for f in os.listdir(public_folder) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]

# ✅ Store results
results_data = {}

def run_inference(image_path):
    """Run YOLOv8 inference on an image and return detections."""
    image = Image.open(image_path)
    results = model(image, verbose=False)

    detections = []
    for result in results:
        if result.masks is None:
            continue
        for box, mask, conf in zip(result.boxes.xyxy, result.masks.xy, result.boxes.conf):
            detections.append({
                "bbox": box.tolist(),  # Convert tensor to list
                "confidence": round(float(conf), 4),  # Add confidence value
            })

    return detections

# ✅ Run inference on all images
for image_file in image_files:
    image_path = os.path.join(public_folder, image_file)
    results_data[image_file] = {
        "detections": run_inference(image_path)
    }

# ✅ Save results to JSON
with open(output_json, "w") as json_file:
    json.dump(results_data, json_file, indent=4)

print(f"✅ YOLO processing complete. Results saved to {output_json}")