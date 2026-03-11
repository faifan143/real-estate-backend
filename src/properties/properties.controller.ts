import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { PropertiesService } from "./properties.service";
import { CreatePropertyDto } from "./dto/create-property.dto";
import { UpdatePropertyDto } from "./dto/update-property.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@Controller("properties")
@UseGuards(JwtAuthGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles("USER")
  @UseInterceptors(
    FilesInterceptor("images", 10, {
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
  create(
    @CurrentUser() user: { userId: number; role: string },
    @Body() dto: CreatePropertyDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const fileNames = files?.map((file) => file.filename) || [];
    return this.propertiesService.create(user.userId, dto, fileNames);
  }

  @Get()
  findAll() {
    return this.propertiesService.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.propertiesService.findOne(id);
  }

  @Patch(":id")
  @UseInterceptors(
    FilesInterceptor("images", 10, {
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
  update(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number; role: string },
    @Body() dto: UpdatePropertyDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const fileNames = files?.map((file) => file.filename) || [];
    return this.propertiesService.update(
      id,
      user.userId,
      user.role,
      dto,
      fileNames,
    );
  }

  @Delete(":id")
  remove(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number; role: string },
  ) {
    return this.propertiesService.remove(id, user.userId, user.role);
  }
}
