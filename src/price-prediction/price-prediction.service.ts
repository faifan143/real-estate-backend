import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PredictPriceDto } from './dto/predict-price.dto';
import * as fs from 'fs';
import * as path from 'path';

interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
}

@Injectable()
export class PricePredictionService {
  private readonly ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  private readonly textModel = process.env.OLLAMA_MODEL || 'llama3.2:3b';
  private readonly visionModel = process.env.OLLAMA_VISION_MODEL || 'llama3.2-vision';

  constructor(private prisma: PrismaService) {}

  async predictPrice(dto: PredictPriceDto) {
    try {
      // Collect images from various sources
      const images = await this.collectImages(dto);

      if (images.length > 0) {
        // Use vision model if images are available
        return await this.predictWithVision(dto, images);
      } else {
        // Use text-only model
        return await this.predictTextOnly(dto);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.message?.includes('fetch failed')) {
        console.warn('Ollama not available, using fallback estimation');
        return this.fallbackEstimation(dto);
      }
      throw new HttpException(
        `Price prediction failed: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async collectImages(dto: PredictPriceDto): Promise<string[]> {
    const images: string[] = [];

    // 1. From direct base64 upload
    if (dto.imageBase64 && dto.imageBase64.length > 0) {
      images.push(...dto.imageBase64);
    }

    // 2. From property ID (fetch from database)
    if (dto.propertyId) {
      const propertyImages = await this.getPropertyImages(dto.propertyId);
      images.push(...propertyImages);
    }

    // Limit to 3 images max for performance
    return images.slice(0, 3);
  }

  private async getPropertyImages(propertyId: number): Promise<string[]> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { images: true },
    });

    if (!property || !property.images.length) {
      return [];
    }

    const base64Images: string[] = [];
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

    for (const img of property.images.slice(0, 3)) {
      const filePath = path.join(uploadsDir, img.fileName);
      if (fs.existsSync(filePath)) {
        try {
          const buffer = fs.readFileSync(filePath);
          base64Images.push(buffer.toString('base64'));
        } catch {
          console.warn(`Could not read image: ${img.fileName}`);
        }
      }
    }

    return base64Images;
  }

  private async predictWithVision(dto: PredictPriceDto, images: string[]) {
    const prompt = this.buildVisionPrompt(dto);

    const response = await fetch(`${this.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.visionModel,
        prompt,
        images,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 300,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Fallback to text model if vision model not available
      if (errorText.includes('not found') || errorText.includes('does not exist')) {
        console.warn('Vision model not available, falling back to text model');
        return this.predictTextOnly(dto);
      }
      throw new Error(`Ollama error: ${errorText}`);
    }

    const data: OllamaResponse = await response.json();
    return this.parseResponse(data.response, dto, 'vision');
  }

  private async predictTextOnly(dto: PredictPriceDto) {
    const prompt = this.buildTextPrompt(dto);

    const response = await fetch(`${this.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.textModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 200,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${await response.text()}`);
    }

    const data: OllamaResponse = await response.json();
    return this.parseResponse(data.response, dto, 'text');
  }

  private buildVisionPrompt(dto: PredictPriceDto): string {
    return `You are a real estate price estimation expert with visual analysis capabilities.

Analyze both the property details AND the images provided to estimate the price.

Property Details:
- Type: ${dto.type}
- Location: ${dto.location}
- Area: ${dto.area} square meters
- Rooms: ${dto.rooms}
${dto.floor ? `- Floor: ${dto.floor}` : ''}
${dto.description ? `- Description: ${dto.description}` : ''}

From the images, assess:
1. Property condition (new, renovated, needs repair)
2. Interior quality (finishes, fixtures)
3. Natural lighting and views
4. Overall appeal and potential issues

IMPORTANT: Respond ONLY in this exact JSON format:
{"estimatedPrice": <number>, "confidence": "<low|medium|high>", "reasoning": "<brief explanation including visual observations>", "visualAssessment": "<condition assessment from images>"}

Price reference: Major city apartments $1500-4000/sqm, houses $1000-3000/sqm. Premium condition adds 20-50%.`;
  }

  private buildTextPrompt(dto: PredictPriceDto): string {
    return `You are a real estate price estimation expert. Analyze the following property and provide a price estimate in USD.

Property Details:
- Type: ${dto.type}
- Location: ${dto.location}
- Area: ${dto.area} square meters
- Rooms: ${dto.rooms}
${dto.floor ? `- Floor: ${dto.floor}` : ''}
${dto.description ? `- Description: ${dto.description}` : ''}

IMPORTANT: Respond ONLY in this exact JSON format, nothing else:
{"estimatedPrice": <number>, "confidence": "<low|medium|high>", "reasoning": "<brief explanation>"}

Consider typical real estate market conditions. For reference:
- Average price per sqm in major cities: $2000-5000
- Apartments typically: $1500-4000/sqm
- Houses typically: $1000-3000/sqm
- Premium locations add 50-200% premium`;
  }

  private parseResponse(response: string, dto: PredictPriceDto, source: string) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          estimatedPrice: parsed.estimatedPrice || this.calculateFallbackPrice(dto),
          currency: 'USD',
          confidence: parsed.confidence || 'medium',
          reasoning: parsed.reasoning || 'Based on property characteristics and location.',
          visualAssessment: parsed.visualAssessment || null,
          source: source === 'vision' ? 'llm-vision' : 'llm-text',
        };
      }
    } catch {
      const priceMatch = response.match(/\$?([\d,]+)/);
      if (priceMatch) {
        return {
          estimatedPrice: parseInt(priceMatch[1].replace(/,/g, '')),
          currency: 'USD',
          confidence: 'low',
          reasoning: response.slice(0, 200),
          visualAssessment: null,
          source,
        };
      }
    }

    return this.fallbackEstimation(dto);
  }

  private fallbackEstimation(dto: PredictPriceDto) {
    const price = this.calculateFallbackPrice(dto);
    return {
      estimatedPrice: price,
      currency: 'USD',
      confidence: 'low',
      reasoning: `Estimated using base calculation: ${dto.area}sqm × base rate for ${dto.type}. Note: Ollama not available, using simplified formula.`,
      visualAssessment: null,
      source: 'fallback',
    };
  }

  private calculateFallbackPrice(dto: PredictPriceDto): number {
    let basePricePerSqm = dto.type === 'APARTMENT' ? 2500 : 2000;
    basePricePerSqm += dto.rooms * 100;

    if (dto.type === 'APARTMENT' && dto.floor) {
      basePricePerSqm += Math.min(dto.floor * 50, 500);
    }

    return Math.round(dto.area * basePricePerSqm);
  }

  async checkOllamaStatus(): Promise<{ available: boolean; textModel: string; visionModel: string; visionAvailable: boolean }> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        const models = data.models?.map((m: any) => m.name) || [];
        return {
          available: true,
          textModel: models.find((m: string) => m.includes(this.textModel)) || models[0] || 'none',
          visionModel: models.find((m: string) => m.includes('vision') || m.includes('llava')) || 'none',
          visionAvailable: models.some((m: string) => m.includes('vision') || m.includes('llava')),
        };
      }
    } catch {
      return { available: false, textModel: 'none', visionModel: 'none', visionAvailable: false };
    }
    return { available: false, textModel: 'none', visionModel: 'none', visionAvailable: false };
  }
}
