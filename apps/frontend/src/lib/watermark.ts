/**
 * Adds subtle "IDA" watermark to generated images in bottom right corner
 * Very delicate, semi-transparent, small, no background
 */
export async function addWatermarkToImage(base64Image: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Load Nasalization font
        const fontFace = new FontFace(
          'Nasalization',
          'url(/fonts/nasalization-rg.ttf)'
        );
        
        fontFace.load().then(() => {
          document.fonts.add(fontFace);
          
          // Very small font size (~1.5% of image height)
          const fontSize = Math.max(10, Math.min(img.width, img.height) / 65);
          
          ctx.font = `${fontSize}px Nasalization`;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          
          const text = 'IDA';
          
          // Padding from edges (~2.5% of image size for better positioning)
          const padding = Math.max(12, Math.min(img.width, img.height) / 40);
          const x = img.width - padding;
          const y = img.height - padding;
          
          // Very subtle, semi-transparent text (30% opacity)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillText(text, x, y);
          
          const watermarkedBase64 = canvas.toDataURL('image/png');
          resolve(watermarkedBase64);
        }).catch((fontError) => {
          // Fallback if font fails to load
          console.warn('Could not load Nasalization font, using default:', fontError);
          
          const fontSize = Math.max(10, Math.min(img.width, img.height) / 65);
          ctx.font = `300 ${fontSize}px Arial, sans-serif`; // Light weight for subtlety
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          
          const text = 'IDA';
          const padding = Math.max(12, Math.min(img.width, img.height) / 40);
          const x = img.width - padding;
          const y = img.height - padding;
          
          // Very subtle, semi-transparent text
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillText(text, x, y);
          
          const watermarkedBase64 = canvas.toDataURL('image/png');
          resolve(watermarkedBase64);
        });
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      if (base64Image.startsWith('data:')) {
        img.src = base64Image;
      } else {
        img.src = `data:image/png;base64,${base64Image}`;
      }
      
    } catch (error) {
      reject(error);
    }
  });
}

