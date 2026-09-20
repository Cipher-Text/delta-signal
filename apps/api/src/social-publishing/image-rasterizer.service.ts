import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

/**
 * Converts a rendered card SVG to PNG. No social platform accepts SVG for
 * posting, so this runs between "card rendered" and "card published".
 */
@Injectable()
export class ImageRasterizerService {
  async svgToPng(svg: string, width: number, height: number): Promise<Buffer> {
    return sharp(Buffer.from(svg), { density: 144 })
      .resize(width, height)
      .png()
      .toBuffer();
  }
}
