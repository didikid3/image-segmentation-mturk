import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

import './App.css';

const App = () => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  const [submissionCode, setSubmissionCode] = useState(null);

  const [aiLoading, setAILoading] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef(null);
  const [image, setImage] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [boundingBoxes, setBoundingBoxes] = useState([]);
  const [startPoint, setStartPoint] = useState(null);
  const [currentBox, setCurrentBox] = useState(null);

  const [selectedBoxIndex, setSelectedBoxIndex] = useState(null);
  const edgeTolerance = 5;


  // Fetch Image
  useEffect(() => {
    axios.get("http://localhost:8080/api")
      .then((response) => {
        setImageUrl(response.data.imageUrl);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching image:", error);
        setLoading(false);
      });
  }, []);

  const loadAndScaleImage = (url) => {
    if (!imageUrl) return;

    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      setImage(img);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      const maxHeight = window.innerHeight * 0.7;
      const maxWidth = window.innerWidth * 0.9;

      let newWidth = img.width;
      let newHeight = img.height;
      const widthScale = maxWidth / img.width;
      const heightScale = maxHeight / img.height;
      const scaleFactor = Math.min(widthScale, heightScale);

      newWidth = img.width * scaleFactor;
      newHeight = img.height * scaleFactor;

      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
    };
  };

  useEffect(() => {
    if(imageUrl){
      loadAndScaleImage(imageUrl);
    }
  }, [imageUrl]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Delete") {
        deleteSelectedBox();
      }
    };
  
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedBoxIndex]);
  


  //EVENT HANDLERS
  const isPointOnBoxEdge = (x, y, box) => {
    const left = box.x;
    const right = box.x + box.width;
    const top = box.y;
    const bottom = box.y + box.height;

    const onLeftEdge = Math.abs(x - left) <= edgeTolerance && y >= top && y <= bottom;
    const onRightEdge = Math.abs(x - right) <= edgeTolerance && y >= top && y <= bottom;
    const onTopEdge = Math.abs(y - top) <= edgeTolerance && x >= left && x <= right;
    const onBottomEdge = Math.abs(y - bottom) <= edgeTolerance && x >= left && x <= right;

    return onLeftEdge || onRightEdge || onTopEdge || onBottomEdge;
  };


  const acceptSelectedAIBox = () => {
    if (selectedBoxIndex === null || !boundingBoxes[selectedBoxIndex]?.aiGenerated) return;

    setBoundingBoxes((prevBoxes) =>
        prevBoxes.map((box, index) =>
            index === selectedBoxIndex ? { ...box, aiGenerated: false } : box
        )
    );

    setSelectedBoxIndex(null);
  };

  const handleMouseDown = (e) => {
    const {offsetX, offsetY} = e.nativeEvent;

    if (selectedBoxIndex !== null) {
      const selectedBox = boundingBoxes[selectedBoxIndex];
      const xSize = 15;
      const xPadding = 5;
      let xX = selectedBox.x + selectedBox.width - xSize - xPadding;
      let xY = selectedBox.y + xPadding;

      // Ensure "X" stays inside the box (if the box is very small)
      if (xX < selectedBox.x) {
          xX = selectedBox.x + xPadding;
      }
      if (xY + xSize > selectedBox.y + selectedBox.height) {
          xY = selectedBox.y + selectedBox.height - xSize - xPadding;
      }

      if (offsetX >= xX && offsetX <= xX + xSize && offsetY >= xY && offsetY <= xY + xSize) {
        deleteSelectedBox();
        return;
      }

      if (selectedBox.aiGenerated){
        let checkX = selectedBox.x + xPadding;
        let checkY = selectedBox.y + selectedBox.height - xSize - xPadding;

        if (checkX + xSize > selectedBox.x + selectedBox.width) {
          checkX = selectedBox.x + selectedBox.width - xSize - xPadding;
        }
        if (checkY < selectedBox.y) {
          checkY = selectedBox.y + xPadding;
        }

        if (offsetX >= checkX && offsetX <= checkX + xSize && offsetY >= checkY && offsetY <= checkY + xSize) {
          acceptSelectedAIBox();
          return;
        }
      }

      const insideBox =
          offsetX >= selectedBox.x &&
          offsetX <= selectedBox.x + selectedBox.width &&
          offsetY >= selectedBox.y &&
          offsetY <= selectedBox.y + selectedBox.height;

      if (insideBox) {
          setIsDragging(true);
          setStartPoint({ x: offsetX, y: offsetY });
          return;
      }
    }

    let clickedIndex = null;

    for (let i=boundingBoxes.length-1; i>=0; i--) {
      if (isPointOnBoxEdge(offsetX, offsetY, boundingBoxes[i])) {
        clickedIndex = i;
        break;
      }
    }

    if (clickedIndex !== null) {
      setSelectedBoxIndex(clickedIndex);
      setIsDragging(false);
      redrawCanvas();
    }
    else {
      setStartPoint({x: offsetX, y: offsetY});
      setIsDrawing(true);
      setIsDragging(false);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
        setIsDragging(false);
        return;
    }

    // 🔹 2️⃣ If drawing a new bounding box, save it
    if (isDrawing && currentBox) {
        setBoundingBoxes((prevBoxes) => [...prevBoxes, currentBox]);
    }

    setIsDrawing(false);
    setCurrentBox(null);
    redrawCanvas();
  };

  const handleMouseMove = (e) => {
    const {offsetX, offsetY} = e.nativeEvent;

    if (isDragging && selectedBoxIndex !== null) {
      setBoundingBoxes((prevBoxes) =>
        prevBoxes.map((box, index) =>
          index === selectedBoxIndex
            ? { ...box, x: box.x + offsetX - startPoint.x, y: box.y + offsetY - startPoint.y }
            : box));

        setStartPoint({x: offsetX, y: offsetY});
        redrawCanvas();
        return;
    }

    if (isDrawing && startPoint){
      setIsDragging(true);

      const width = offsetX - startPoint.x;
      const height = offsetY - startPoint.y;

      setCurrentBox({x: startPoint.x, y: startPoint.y, width, height});
      redrawCanvas();
    }
  };

  const redrawCanvas = () => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    boundingBoxes.forEach((box, index) => {
      // Use a different style for AI-generated boxes
      ctx.strokeStyle = box.aiGenerated ? "blue" : "red";
      ctx.lineWidth = 2;
      ctx.setLineDash(box.aiGenerated ? [6, 4] : []); // AI = Dashed, User = Solid
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      // Highlight selected box
      if (index === selectedBoxIndex) {
        ctx.strokeStyle = "magenta"; // Highlight selection
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        const xSize = 15;
        const xPadding = 5;
        let xX = box.x + box.width - xSize - xPadding;
        let xY = box.y + xPadding;

        if (xX < box.x) {
          xX = box.x + xPadding;
        }
        if (xY + xSize > box.y + box.height) {
          xY = box.y + box.height - xSize - xPadding;
        }

        ctx.fillStyle = "magenta";
        ctx.fillRect(xX, xY, xSize, xSize); // Square background

        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xX + 3, xY + 3);
        ctx.lineTo(xX + xSize - 3, xY + xSize - 3);
        ctx.moveTo(xX + xSize - 3, xY + 3);
        ctx.lineTo(xX + 3, xY + xSize - 3);
        ctx.stroke();

        if (box.aiGenerated){
          let checkX = box.x + xPadding;
          let checkY = box.y + box.height - xSize - xPadding;

          if (checkX + xSize > box.x + box.width){
            checkX = box.x + box.width - xSize - xPadding;
          }
          if (checkY < box.y){
            checkY = box.y + xPadding;
          }

          ctx.fillStyle = "green";
          ctx.fillRect(checkX, checkY, xSize, xSize);

          ctx.strokeStyle = "white";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(checkX + 3, checkY + xSize / 2);
          ctx.lineTo(checkX + xSize / 2, checkY + xSize - 3);
          ctx.lineTo(checkX + xSize - 3, checkY + 3);
          ctx.stroke();
        }
      }
    });

    if (currentBox) {
      ctx.strokeStyle = "#ff00ff";
      ctx.setLineDash([]);
      ctx.strokeRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height);
    }
  };

  useEffect(() => {
    redrawCanvas();
  }, [boundingBoxes]);



  // BUTTON CONTROLS
  const clearAnnotations = () => {
    setBoundingBoxes([]);
    redrawCanvas();
  }

  const submitAnnotations = () => {
    const payload = {
      imageUrl,
      annotations: boundingBoxes
    }

    axios.post("http://localhost:8080/submit", payload)
      .then((response) => {
        console.log("Annotations saved:", response.data);
        setSubmissionCode(response.data.entry.submissionID);
        setBoundingBoxes([]);
        setCurrentBox(null);

        if (canvasRef.current) redrawCanvas();
      })
      .catch((error) => {
        console.error("Error saving annotations:", error);
      });
  };

  const startNewAnnotation = () => {
    setSubmissionCode(null);
    setBoundingBoxes([]);
    setCurrentBox(null);
    
    axios.get("http://localhost:8080/api")
      .then((response) => {
        setImageUrl(response.data.imageUrl);
      })
      .catch((error) => {
        console.error("Error fetching image:", error);
      });
  };

  const getAIAssistance = () => {
    setAILoading(true);

    axios.post("http://localhost:8080/api/segment", {imageUrl})
      .then((response) => {
        console.log("AI Predicts:", response.data);

        const detections = response.data.detections;
        if (!image || !detections) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const scaleX = canvas.width / image.width;
        const scaleY = canvas.height / image.height;

        const aiBboxes = response.data.detections.map((detection) => {
          const [x1, y1, x2, y2] = detection.bbox;
          return {
            x: x1 * scaleX,
            y: y1 * scaleY,
            width: (x2 - x1) * scaleX,
            height: (y2 - y1) * scaleY,
            aiGenerated: true
          };
        });

        setBoundingBoxes((prevBoxes) => [...prevBoxes, ...aiBboxes]);
        redrawCanvas();

      })
      .catch((error) => {
        console.error("Error getting AI assistance:", error);
      })
      .finally(() => {
        setAILoading(false);
      });
  };

  const deleteSelectedBox = () => {
    if (selectedBoxIndex === null) return;

    setBoundingBoxes(boundingBoxes.filter((box, index) => index !== selectedBoxIndex));

    setSelectedBoxIndex(null);
    redrawCanvas();
  };

  const acceptAllAIBoundingBoxes = () => {
    setBoundingBoxes((prevBoxes) => 
      prevBoxes.map((box) => ({
        ...box,
        aiGenerated: false
      }))
    );
    redrawCanvas();
  };


  return (
    <div className="app-container">
      <h2 className="title">Image Segmentation</h2>
      <p className="subtitle">Please draw bounding boxes around the animals.</p>

      {submissionCode ? (
        <div className="submission-container">
          <h3> Submission Complete!</h3>
          <p>Your submission code: <strong>{submissionCode}</strong></p>
          <button className="new-annotation-button" onClick={startNewAnnotation}>Start New Annotation</button>
        </div>
      ) : (
        <>
          <div className="canvas-container">
            {loading ? (
              <p>Loading image...</p>
              ) : (
              <canvas
                ref={canvasRef}
                className="canvas"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
              />
            )}
          </div>
          <div className="button-container">
            <div className="button-group left">
              <button className="clear-button" onClick={clearAnnotations}>Clear Annotations</button>
              <button className="delete-button" onClick={deleteSelectedBox} disabled={selectedBoxIndex === null}>
                Delete Selected Box
              </button>
            </div>

            <div className="button-group center">
              <button className="ai-assist-button" onClick={getAIAssistance} disabled={aiLoading}>
                { aiLoading ? "Processing..." : "Get AI Assistance" }
              </button>
              
              <button className="merge-button" onClick={acceptAllAIBoundingBoxes} disabled={!boundingBoxes.some(box => box.aiGenerated)}>
                Accept All AI Boxes
              </button>
            </div>

            <div className="button-group right">
            <button className="submit-button" onClick={submitAnnotations}>Submit Annotations</button>
            </div>
          </div>
        </>
      )}
      
    </div>
  );
};

export default App;