import type { Express } from "express";
import fs from "fs/promises";

const signatures = {
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  jpg: Buffer.from([0xff, 0xd8, 0xff]),
};

export async function validateUploadedImage(file: Express.Multer.File): Promise<void> {
  const header = await fs.readFile(file.path).then((buf) => buf.subarray(0, 8));
  const isPng = header.subarray(0, signatures.png.length).equals(signatures.png);
  const isJpg = header.subarray(0, signatures.jpg.length).equals(signatures.jpg);

  if (!isPng && !isJpg) {
    await fs.unlink(file.path).catch(() => undefined);
    throw new Error("Uploaded file content is not a valid PNG or JPEG image");
  }
}
