import {
  Injectable,
  HttpException,
  HttpStatus,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PredictPriceDto } from "./dto/predict-price.dto";
import * as fs from "fs";
import * as path from "path";

interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
}

interface PriceData {
  city: string;
  type: string;
  neighborhood: string;
  area_sqm: number;
  rooms: number;
  price_min_usd: number;
  price_max_usd: number;
  price_per_sqm_usd: number;
  tier: string;
}

@Injectable()
export class PricePredictionService implements OnModuleInit {
  private readonly ollamaUrl =
    process.env.OLLAMA_URL || "http://localhost:11434";
  private readonly textModel = process.env.OLLAMA_MODEL || "llama3.2:3b";
  private readonly visionModel =
    process.env.OLLAMA_VISION_MODEL || "llama3.2-vision";
  private priceDatabase: PriceData[] = [];

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    this.loadPriceDatabase();
  }

  private loadPriceDatabase() {
    try {
      const csvPath = path.join(process.cwd(), "data", "syria_prices.csv");
      if (fs.existsSync(csvPath)) {
        const content = fs.readFileSync(csvPath, "utf-8");
        const lines = content
          .split("\n")
          .filter((line) => line.trim() && !line.startsWith("#"));

        // Skip header
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",");
          if (cols.length >= 10) {
            this.priceDatabase.push({
              city: cols[0]?.trim(),
              type: cols[1]?.trim(),
              neighborhood: cols[2]?.trim(),
              area_sqm: parseFloat(cols[3]) || 0,
              rooms: parseInt(cols[4]) || 0,
              price_min_usd: parseFloat(cols[6]) || 0,
              price_max_usd: parseFloat(cols[7]) || 0,
              price_per_sqm_usd: parseFloat(cols[8]) || 0,
              tier: cols[11]?.trim() || "mid",
            });
          }
        }
        console.log(
          `Loaded ${this.priceDatabase.length} price records from database`,
        );
      }
    } catch (error) {
      console.warn("Could not load price database:", error.message);
    }
  }

  private getMarketContext(location: string, type: string): string {
    const locationLower = location.toLowerCase();

    // Detect city
    let city = "unknown";
    if (locationLower.includes("aleppo") || locationLower.includes("حلب"))
      city = "Aleppo";
    else if (
      locationLower.includes("damascus") ||
      locationLower.includes("دمشق")
    )
      city = "Damascus";
    else if (
      locationLower.includes("latakia") ||
      locationLower.includes("اللاذقية")
    )
      city = "Latakia";
    else if (locationLower.includes("homs") || locationLower.includes("حمص"))
      city = "Homs";
    else if (
      locationLower.includes("tartus") ||
      locationLower.includes("طرطوس")
    )
      city = "Tartus";

    // Filter relevant data
    const cityData = this.priceDatabase.filter(
      (p) => p.city.toLowerCase() === city.toLowerCase() && p.type === type,
    );

    if (cityData.length === 0) {
      return this.getGenericMarketContext();
    }

    // Calculate statistics
    const primes = cityData.filter(
      (p) => p.tier === "prime" || p.tier === "premium",
    );
    const mids = cityData.filter((p) => p.tier === "mid");
    const budgets = cityData.filter((p) => p.tier === "budget");

    const avgPrime =
      primes.length > 0
        ? Math.round(
            primes.reduce((a, b) => a + b.price_per_sqm_usd, 0) / primes.length,
          )
        : 0;
    const avgMid =
      mids.length > 0
        ? Math.round(
            mids.reduce((a, b) => a + b.price_per_sqm_usd, 0) / mids.length,
          )
        : 0;
    const avgBudget =
      budgets.length > 0
        ? Math.round(
            budgets.reduce((a, b) => a + b.price_per_sqm_usd, 0) /
              budgets.length,
          )
        : 0;

    // Find matching neighborhoods
    const matchingNeighborhoods = cityData
      .filter((p) => locationLower.includes(p.neighborhood.toLowerCase()))
      .slice(0, 3);

    let context = `
SYRIA REAL ESTATE MARKET DATA (2024-2025):

City: ${city}
Property Type: ${type}

Price per square meter (USD):
- Premium/Prime areas: $${avgPrime || "N/A"}/sqm
- Mid-range areas: $${avgMid || "N/A"}/sqm  
- Budget areas: $${avgBudget || "N/A"}/sqm
`;

    if (matchingNeighborhoods.length > 0) {
      context += `\nMatching neighborhood data found:\n`;
      matchingNeighborhoods.forEach((n) => {
        context += `- ${n.neighborhood}: $${n.price_min_usd}-$${n.price_max_usd} (${n.area_sqm}sqm, ${n.rooms}rooms)\n`;
      });
    }

    // Add city-specific insights
    if (city === "Damascus") {
      context += `\nNote: Damascus has the highest prices in Syria. Premium areas (Al-Malki, Abu Rummaneh) can reach $2500-3000/sqm.`;
    } else if (city === "Aleppo") {
      context += `\nNote: Aleppo market is recovering. Prime areas (Al-Aziziyah, Sulaymaniyah) around $800-1000/sqm.`;
    } else if (city === "Latakia") {
      context += `\nNote: Coastal premium. Seafront properties 50-100% higher than inland.`;
    }

    return context;
  }

  private getGenericMarketContext(): string {
    return `
SYRIA REAL ESTATE MARKET DATA (2024-2025):

Average prices by city (USD per sqm):
- Damascus: $500-3000/sqm (varies by neighborhood)
- Aleppo: $200-1000/sqm
- Latakia: $400-2000/sqm (coastal premium)
- Homs: $400-1200/sqm
- Tartus: $350-850/sqm

Note: Prices quoted in USD due to Syrian Pound volatility. Market recovering with expatriate investment.`;
  }

  async predictPrice(dto: PredictPriceDto) {
    try {
      const images = await this.collectImages(dto);

      if (images.length > 0) {
        return await this.predictWithVision(dto, images);
      } else {
        return await this.predictTextOnly(dto);
      }
    } catch (error) {
      if (
        error.code === "ECONNREFUSED" ||
        error.message?.includes("fetch failed")
      ) {
        console.warn("Ollama not available, using fallback estimation");
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

    if (dto.imageBase64 && dto.imageBase64.length > 0) {
      images.push(...dto.imageBase64);
    }

    if (dto.propertyId) {
      const propertyImages = await this.getPropertyImages(dto.propertyId);
      images.push(...propertyImages);
    }

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
    const uploadsDir = path.join(process.cwd(), "public", "uploads");

    for (const img of property.images.slice(0, 3)) {
      const filePath = path.join(uploadsDir, img.fileName);
      if (fs.existsSync(filePath)) {
        try {
          const buffer = fs.readFileSync(filePath);
          base64Images.push(buffer.toString("base64"));
        } catch {
          console.warn(`Could not read image: ${img.fileName}`);
        }
      }
    }

    return base64Images;
  }

  private async predictWithVision(dto: PredictPriceDto, images: string[]) {
    const marketContext = this.getMarketContext(dto.location, dto.type);
    const prompt = this.buildVisionPrompt(dto, marketContext);

    const response = await fetch(`${this.ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.visionModel,
        prompt,
        images,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 400,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (
        errorText.includes("not found") ||
        errorText.includes("does not exist")
      ) {
        console.warn("Vision model not available, falling back to text model");
        return this.predictTextOnly(dto);
      }
      throw new Error(`Ollama error: ${errorText}`);
    }

    const data: OllamaResponse = await response.json();
    return this.parseResponse(data.response, dto, "vision");
  }

  private async predictTextOnly(dto: PredictPriceDto) {
    const marketContext = this.getMarketContext(dto.location, dto.type);
    const prompt = this.buildTextPrompt(dto, marketContext);

    const response = await fetch(`${this.ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.textModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 300,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${await response.text()}`);
    }

    const data: OllamaResponse = await response.json();
    return this.parseResponse(data.response, dto, "text");
  }

  private buildVisionPrompt(
    dto: PredictPriceDto,
    marketContext: string,
  ): string {
    return `You are a Syrian real estate price estimation expert with visual analysis capabilities.

${marketContext}

PROPERTY TO ANALYZE:
- Type: ${dto.type}
- Location: ${dto.location}
- Area: ${dto.area} square meters
- Rooms: ${dto.rooms}
${dto.floor ? `- Floor: ${dto.floor}` : ""}
${dto.description ? `- Description: ${dto.description}` : ""}

From the images, assess:
1. Property condition (new, renovated, needs repair)
2. Interior quality (finishes, fixtures)
3. Natural lighting and views
4. Overall appeal and potential issues

CALCULATION METHOD:
1. Identify the city and neighborhood tier (premium/mid/budget)
2. Use the market data above to find appropriate $/sqm rate
3. Multiply: area × price_per_sqm = estimated price
4. Adjust based on: condition (+/-20%), floor level, views

RESPOND ONLY in this JSON format:
{"estimatedPrice": <number in USD>, "confidence": "<low|medium|high>", "reasoning": "<explain calculation using market data>", "visualAssessment": "<condition from images>"}`;
  }

  private buildTextPrompt(dto: PredictPriceDto, marketContext: string): string {
    return `You are a Syrian real estate price estimation expert.

${marketContext}

PROPERTY TO ANALYZE:
- Type: ${dto.type}
- Location: ${dto.location}
- Area: ${dto.area} square meters
- Rooms: ${dto.rooms}
${dto.floor ? `- Floor: ${dto.floor}` : ""}
${dto.description ? `- Description: ${dto.description}` : ""}

CALCULATION METHOD:
1. Identify the city from the location
2. Determine neighborhood tier (premium/mid/budget) based on location description
3. Use the market data above to find appropriate $/sqm rate
4. Calculate: area × price_per_sqm = estimated price
5. Adjust for: number of rooms, floor level if apartment

RESPOND ONLY in this JSON format:
{"estimatedPrice": <number in USD>, "confidence": "<low|medium|high>", "reasoning": "<show your calculation using market data>"}`;
  }

  private parseResponse(
    response: string,
    dto: PredictPriceDto,
    source: string,
  ) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          estimatedPrice:
            parsed.estimatedPrice || this.calculateFallbackPrice(dto),
          currency: "USD",
          confidence: parsed.confidence || "medium",
          reasoning:
            parsed.reasoning ||
            "Based on property characteristics and location.",
          visualAssessment: parsed.visualAssessment || null,
          source: source === "vision" ? "llm-vision" : "llm-text",
        };
      }
    } catch {
      const priceMatch = response.match(/\$?([\d,]+)/);
      if (priceMatch) {
        return {
          estimatedPrice: parseInt(priceMatch[1].replace(/,/g, "")),
          currency: "USD",
          confidence: "low",
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
      currency: "USD",
      confidence: "medium",
      reasoning: `Estimated using Syria market data: ${dto.area}sqm × calculated rate for ${dto.location}.`,
      visualAssessment: null,
      source: "fallback",
    };
  }

  private calculateFallbackPrice(dto: PredictPriceDto): number {
    const locationLower = dto.location.toLowerCase();

    // Detect city and set base price
    let basePricePerSqm = 500; // default

    if (locationLower.includes("damascus") || locationLower.includes("دمشق")) {
      basePricePerSqm = dto.type === "APARTMENT" ? 1200 : 1500;
    } else if (
      locationLower.includes("aleppo") ||
      locationLower.includes("حلب")
    ) {
      basePricePerSqm = dto.type === "APARTMENT" ? 500 : 400;
    } else if (
      locationLower.includes("latakia") ||
      locationLower.includes("اللاذقية")
    ) {
      basePricePerSqm = dto.type === "APARTMENT" ? 800 : 600;
    } else if (
      locationLower.includes("homs") ||
      locationLower.includes("حمص")
    ) {
      basePricePerSqm = dto.type === "APARTMENT" ? 600 : 500;
    } else if (
      locationLower.includes("tartus") ||
      locationLower.includes("طرطوس")
    ) {
      basePricePerSqm = dto.type === "APARTMENT" ? 550 : 450;
    }

    // Adjust for premium keywords
    const premiumKeywords = [
      "malki",
      "مالكي",
      "mezzeh",
      "مزة",
      "aziziyah",
      "عزيزية",
      "sulaymaniyah",
      "sea",
      "بحر",
    ];
    const budgetKeywords = [
      "hanano",
      "sakhour",
      "outskirts",
      "countryside",
      "ريف",
    ];

    if (premiumKeywords.some((k) => locationLower.includes(k))) {
      basePricePerSqm *= 1.8;
    } else if (budgetKeywords.some((k) => locationLower.includes(k))) {
      basePricePerSqm *= 0.5;
    }

    // Room and floor adjustments
    basePricePerSqm += dto.rooms * 30;
    if (dto.type === "APARTMENT" && dto.floor && dto.floor > 3) {
      basePricePerSqm *= 1.1;
    }

    return Math.round(dto.area * basePricePerSqm);
  }

  async checkOllamaStatus(): Promise<{
    available: boolean;
    textModel: string;
    visionModel: string;
    visionAvailable: boolean;
    priceDataLoaded: number;
  }> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        const models = data.models?.map((m: any) => m.name) || [];
        return {
          available: true,
          textModel:
            models.find((m: string) => m.includes(this.textModel)) ||
            models[0] ||
            "none",
          visionModel:
            models.find(
              (m: string) => m.includes("vision") || m.includes("llava"),
            ) || "none",
          visionAvailable: models.some(
            (m: string) => m.includes("vision") || m.includes("llava"),
          ),
          priceDataLoaded: this.priceDatabase.length,
        };
      }
    } catch {
      return {
        available: false,
        textModel: "none",
        visionModel: "none",
        visionAvailable: false,
        priceDataLoaded: this.priceDatabase.length,
      };
    }
    return {
      available: false,
      textModel: "none",
      visionModel: "none",
      visionAvailable: false,
      priceDataLoaded: this.priceDatabase.length,
    };
  }
}
