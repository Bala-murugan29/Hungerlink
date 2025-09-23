import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || 'demo-key');

export interface FoodQualityResult {
    quality: 'fresh' | 'check' | 'not-suitable';
    confidence: number;
    reasons: string[];
    recommendations: string[];
    // Language code the model responded in (e.g., 'en', 'hi', 'ta')
    language?: string;
}

export class GeminiService {
    private model;

    constructor() {
                this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    }

    async analyzeFoodQuality(
        foodType: string,
        manufacturingDate: string,
        imageFile?: File,
        lang: string = (navigator?.language?.split?.('-')?.[0] || 'en')
    ): Promise<FoodQualityResult> {
        try {
            // Normalize language to base code (e.g., 'en-US' -> 'en')
            const normalizedLang = lang.split('-')[0].toLowerCase();
            
            let prompt = `
                Analyze the food quality for donation based on the following information:

                Food Type: ${foodType}
                Manufacturing Date/Time: ${manufacturingDate}
                Current Time: ${new Date().toLocaleString()}

                Respond ONLY in language code: ${normalizedLang}. Keep it concise.

                Please evaluate if this food is suitable for donation and provide:
                1. Quality rating: "fresh", "check", or "not-suitable"
                2. Confidence level (0-100)
                3. Specific reasons for your assessment
                4. Recommendations for the donor
                5. Use the manufacturing date/time together with the food type and image to determine freshness and safety.
  Consider factors like:
                - Time since manufacturing
                - Food type and perishability
                - Visual spoilage indicators in the image
                - Safety for consumption

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
                    recommendations: analysis.recommendations || ['Follow food safety guidelines'],
                    language: normalizedLang
                };
            }

            // Fallback if JSON parsing fails
            return this.getFallbackAnalysis(foodType, manufacturingDate, normalizedLang);

        } catch (error) {
            console.error('Gemini analysis error:', error);
            return this.getFallbackAnalysis(foodType, manufacturingDate, lang.split('-')[0].toLowerCase());
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

    private getFallbackAnalysis(foodType: string, manufacturingDate: string, lang?: string): FoodQualityResult {
        // Best-effort fallback using manufacturing date/time
        // manufacturingDate is expected as an ISO-like string (e.g. 2025-09-18T14:30)
        try {
            const now = new Date();
            const mfd = manufacturingDate ? new Date(manufacturingDate) : null;
            if (!mfd || isNaN(mfd.getTime())) {
                return {
                    quality: 'check',
                    confidence: 55,
                    reasons: ['No valid manufacturing date provided'],
                    recommendations: ['Provide manufacturing date or a photo for better analysis'],
                    language: lang
                };
            }

            const hoursSince = Math.max(0, (now.getTime() - mfd.getTime()) / (1000 * 60 * 60));

            // Rough perishability map (hours until high risk at room temp)
            const perishability: Record<string, number> = {
                'cooked rice': 6,
                'cooked food': 8,
                'meat': 24,
                'fish': 24,
                'dairy': 48,
                'vegetables': 72,
                'fruits': 72,
                'bread': 72,
                'default': 48
            };

            const key = (foodType || '').toLowerCase();
            let threshold = perishability['default'];
            for (const k of Object.keys(perishability)) {
                if (k !== 'default' && key.includes(k.split(' ')[0])) {
                    threshold = perishability[k];
                    break;
                }
            }

            if (hoursSince <= Math.max(6, threshold * 0.25)) {
                return {
                    quality: 'fresh',
                    confidence: Math.min(95, 70 + (threshold - hoursSince)),
                    reasons: [`Manufactured ${Math.round(hoursSince)} hours ago; within safe window for this food type`],
                    recommendations: ['Safe for donation; distribute soon', 'Keep refrigerated if applicable'],
                    language: lang
                };
            }

            if (hoursSince <= threshold) {
                return {
                    quality: 'check',
                    confidence: Math.max(50, 70 - (hoursSince / threshold) * 30),
                    reasons: [`Manufactured ${Math.round(hoursSince)} hours ago; may still be OK depending on storage`],
                    recommendations: ['Verify smell and appearance', 'Keep chilled and deliver quickly'],
                    language: lang
                };
            }

            return {
                quality: 'not-suitable',
                confidence: 90,
                reasons: [`Manufactured ${Math.round(hoursSince)} hours ago; likely beyond safe window for donation`],
                recommendations: ['Do not donate if spoiled', 'Dispose safely if in doubt'],
                language: lang
            };
        } catch (e) {
            return {
                quality: 'check',
                confidence: 50,
                reasons: ['Unable to evaluate manufacturing date'],
                recommendations: ['Provide photo and clear manufacturing date/time'],
                language: lang
            };
        }
    }
}

export const geminiService = new GeminiService();