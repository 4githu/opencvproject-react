// types.ts
interface HeadCoordinates {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }
  
  // lib/HeadDetector.ts
  export class HeadDetector {
    private x1: number;
    private y1: number;
    private x2: number;
    private y2: number;
    private threshold: number = 0.5;
  
    constructor(x1: number, y1: number, x2: number, y2: number) {
      this.x1 = x1 * 10;
      this.y1 = y1 * 10;
      this.x2 = x2 * 10;
      this.y2 = y2 * 10;
    }
  
    private async calculateRatio(imageUrl: string): Promise<number> {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
  
          // Set canvas size to ROI dimensions
          const width = this.x2 - this.x1;
          const height = this.y2 - this.y1;
          canvas.width = width;
          canvas.height = height;
  
          // Draw only the ROI portion of the image
          ctx.drawImage(
            img,
            this.x1, this.y1, width, height,  // source coordinates
            0, 0, width, height               // destination coordinates
          );
  
          // Get image data
          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;
          
          // Convert to HSV and count dark pixels
          let blackPixels = 0;
          const totalPixels = width * height;
          
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Convert RGB to HSV
            const hsv = this.rgbToHsv(r, g, b);
            
            // Check if pixel matches criteria (similar to C++ version)
            if ((hsv.h >= 0 && hsv.h <= 40 && hsv.s <= 40) || 
                (hsv.h >= 160 && hsv.h <= 200 && hsv.s <= 40)) {
              blackPixels++;
            }
          }
  
          const ratio = blackPixels / totalPixels;
          resolve(ratio);
        };
  
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
  
        img.src = imageUrl;
      });
    }
  
    private rgbToHsv(r: number, g: number, b: number) {
      r /= 255;
      g /= 255;
      b /= 255;
  
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const diff = max - min;
  
      let h = 0;
      const s = max === 0 ? 0 : diff / max;
      const v = max;
  
      if (diff === 0) {
        h = 0;
      } else if (max === r) {
        h = 60 * ((g - b) / diff + (g < b ? 6 : 0));
      } else if (max === g) {
        h = 60 * ((b - r) / diff + 2);
      } else if (max === b) {
        h = 60 * ((r - g) / diff + 4);
      }
  
      return { h, s: s * 100, v: v * 100 };
    }
  
    async check(imageUrl: string): Promise<boolean> {
      try {
        const ratio = await this.calculateRatio(imageUrl);
        return ratio > this.threshold;
      } catch (error) {
        console.error('Error processing image:', error);
        return false;
      }
    }
  }
  
  // components/HeadDetectionDemo.tsx
  import { useState, useEffect } from 'react';
  import { HeadDetector } from '../lib/HeadDetector';
  
  const HeadDetectionDemo = () => {
    const [results, setResults] = useState<Record<string, boolean>>({});
    
    useEffect(() => {
      const detectors = {
        'a605': new HeadDetector(25, 40, 53, 63),
        'a606': new HeadDetector(92, 37, 104, 61),
        'a608': new HeadDetector(77, 27, 86, 36),
      };
  
      const testImages = {
        head: '/path/to/open_yp.bmp',
        landscape: '/path/to/open_np.bmp',
      };
  
      const runDetection = async () => {
        const newResults: Record<string, boolean> = {};
  
        for (const [detectorName, detector] of Object.entries(detectors)) {
          for (const [imageType, imagePath] of Object.entries(testImages)) {
            const result = await detector.check(imagePath);
            newResults[`${detectorName}_${imageType}`] = result;
          }
        }
  
        setResults(newResults);
      };
  
      runDetection();
    }, []);
  
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Head Detection Results</h2>
        <div className="space-y-2">
          {Object.entries(results).map(([key, result]) => (
            <div key={key} className="flex items-center space-x-2">
              <span className="font-medium">{key}:</span>
              <span className={result ? "text-green-600" : "text-red-600"}>
                {result ? "True" : "False"}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  export default HeadDetectionDemo;