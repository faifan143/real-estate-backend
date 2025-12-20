import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PropertiesModule } from './properties/properties.module';
import { PropertyImagesModule } from './property-images/property-images.module';
import { RequestsModule } from './requests/requests.module';
import { AdminRequestsModule } from './admin-requests/admin-requests.module';
import { MeetingsModule } from './meetings/meetings.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PropertiesModule,
    PropertyImagesModule,
    RequestsModule,
    AdminRequestsModule,
    MeetingsModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    },
  ],
})
export class AppModule {}
