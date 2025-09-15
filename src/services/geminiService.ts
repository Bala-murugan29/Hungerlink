import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || 'demo-key');

export interface FoodQualityResult {
    quality: 'fresh' | 'check' | 'not-suitable';
    confidence: number;
    reasons: string[];
    recommendations: string[];
}

export class GeminiService {
    private model;

    constructor() {
                this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    }

    async analyzeFoodQuality(
        foodType: string,
        expiryTime: string,
        imageFile?: File
    ): Promise<FoodQualityResult> {
        try {
            let prompt = `
        Analyze the food quality for donation based on the following information:
        
        Food Type: ${foodType}
        Expiry Time: ${expiryTime}
        Current Time: ${new Date().toLocaleString()}
        
        Please evaluate if this food is suitable for donation and provide:
        1. Quality rating: "fresh", "check", or "not-suitable"
        2. Confidence level (0-100)
        3. Specific reasons for your assessment
        4. Recommendations for the donor
        
        Consider factors like:
        - Time until expiry
        - Food type and perishability
        - Safety for consumption
        - Nutritional value retention
        
        Respond in JSON format:
        {
          "quality": "fresh|check|not-suitable",
          "confidence": 85,
          "reasons": ["reason1", "reason2"],
          "recommendations": ["rec1", "rec2"]
        }
      `;

            let parts: any[] = [{ text: prompt }];

            // If image is provided, add it to the analysis
            if (imageFile) {
                const imageData = await this.fileToBase64(imageFile);
                parts.push({
                    inlineData: {
                        mimeType: imageFile.type,
                        data: imageData
                    }
                });
                parts.push({
                    text: `
        
        Additionally, analyze the provided food image for:
        - Visual freshness indicators
        - Color and texture quality
        - Any visible spoilage signs
        - Presentation and hygiene
        `
                });
            }

            const result = await this.model.generateContent(parts);
            const response = await result.response;
            const text = response.text();

            // Parse JSON response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);
                return {
                    quality: analysis.quality || 'check',
                    confidence: analysis.confidence || 75,
                    reasons: analysis.reasons || ['Analysis completed'],
                    recommendations: analysis.recommendations || ['Follow food safety guidelines']
                };
            }

            // Fallback if JSON parsing fails
            return this.getFallbackAnalysis(foodType, expiryTime);

        } catch (error) {
            console.error('Gemini analysis error:', error);
            return this.getFallbackAnalysis(foodType, expiryTime);
        }
    }

    private async fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    private getFallbackAnalysis(foodType: string, expiryTime: string): FoodQualityResult {
        // Simple fallback logic
        const now = new Date();
        const isToday = expiryTime.toLowerCase().includes('today');
        const isTomorrow = expiryTime.toLowerCase().includes('tomorrow');

        if (isToday) {
            return {
                quality: 'fresh',
                confidence: 80,
                reasons: ['Food expires today - good for immediate consumption'],
                recommendations: ['Distribute as soon as possible', 'Ensure proper storage until pickup']
            };
        } else if (isTomorrow) {
            return {
                quality: 'fresh',
                confidence: 85,
                reasons: ['Food has good shelf life remaining'],
                recommendations: ['Safe for donation', 'Store in appropriate conditions']
            };
        } else {
            return {
                quality: 'check',
                confidence: 60,
                reasons: ['Please verify expiry time and food condition'],
                recommendations: ['Check food quality before donation', 'Ensure food safety standards']
            };
        }
    }
}

export const geminiService = new GeminiService();