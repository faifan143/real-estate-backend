import { Module } from '@nestjs/common';
import { PropertyImagesService } from './property-images.service';
import { PropertyImagesController } from './property-images.controller';

@Module({
  controllers: [PropertyImagesController],
  providers: [PropertyImagesService],
})
export class PropertyImagesModule {}
