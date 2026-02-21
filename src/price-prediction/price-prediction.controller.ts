import { Controller, Post, Get, Body, UseGuards } from "@nestjs/common";
import { PricePredictionService } from "./price-prediction.service";
import { PredictPriceDto } from "./dto/predict-price.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("properties")
@UseGuards(JwtAuthGuard)
export class PricePredictionController {
  constructor(
    private readonly pricePredictionService: PricePredictionService,
  ) {}

  @Post("predict-price")
  async predictPrice(@Body() dto: PredictPriceDto) {
    return this.pricePredictionService.predictPrice(dto);
  }

  @Get("prediction-status")
  async getStatus() {
    return this.pricePredictionService.checkOllamaStatus();
  }
}
