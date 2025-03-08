import sys
import json
from ultralytics import YOLO
from PIL import Image

# ✅ Load YOLOv8 segmentation model
model = YOLO("yolov8n-seg.pt")

def run_inference(image_path):
    image = Image.open(image_path)
    results = model(image, verbose=False)

    detections = []
    for result in results:
        if result.masks is None:
            continue
        for box, mask in zip(result.boxes.xyxy, result.masks.xy):
            detections.append({
                "bbox": box.tolist(),  # Convert tensor to list
                "mask": [list(map(float, point)) for point in mask]  # Convert masks to lists
            })

    return detections

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Please provide an image path"}))
        sys.exit(1)

    image_path = sys.argv[1]
    results = run_inference(image_path)
    
    print(json.dumps({"detections" : results}))
    sys.stdout.flush()
