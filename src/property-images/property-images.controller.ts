import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { PropertyImagesService } from "./property-images.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@Controller("properties/:propertyId/images")
@UseGuards(JwtAuthGuard)
export class PropertyImagesController {
  constructor(private readonly propertyImagesService: PropertyImagesService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor("image", {
      storage: diskStorage({
        destination: "./public/uploads",
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join("");
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return cb(
            new BadRequestException("Only image files are allowed"),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadImage(
    @Param("propertyId", ParseIntPipe) propertyId: number,
    @CurrentUser() user: { userId: number; role: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    return this.propertyImagesService.create(
      propertyId,
      user.userId,
      user.role,
      file.filename,
    );
  }

  @Delete(":imageId")
  async removeImage(
    @Param("propertyId", ParseIntPipe) propertyId: number,
    @Param("imageId", ParseIntPipe) imageId: number,
    @CurrentUser() user: { userId: number; role: string },
  ) {
    return this.propertyImagesService.remove(
      propertyId,
      imageId,
      user.userId,
      user.role,
    );
  }
}
