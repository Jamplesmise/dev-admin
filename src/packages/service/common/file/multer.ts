/**
 * 文件上传处理
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import multer from 'multer';
import path from 'path';
import { nanoid } from 'nanoid';

export type FileType = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  filename: string;
  path: string;
  size: number;
};

/**
 * 获取文件上传处理器
 * @param maxSize 最大文件大小 (MB)
 */
export const getUploadModel = ({ maxSize = 500 }: { maxSize?: number } = {}) => {
  const maxSizeBytes = maxSize * 1024 * 1024;

  class UploadModel {
    uploaderSingle = multer({
      limits: {
        fieldSize: maxSizeBytes
      },
      preservePath: true,
      storage: multer.diskStorage({
        filename: (_req, file, cb) => {
          if (!file?.originalname) {
            cb(new Error('File not found'), '');
          } else {
            const { ext } = path.parse(decodeURIComponent(file.originalname));
            cb(null, `${nanoid()}${ext}`);
          }
        }
      })
    }).single('file');

    async getUploadFile<T = Record<string, unknown>>(
      req: NextApiRequest,
      res: NextApiResponse
    ): Promise<{
      file: FileType;
      metadata: Record<string, unknown>;
      data: T;
    }> {
      return new Promise((resolve, reject) => {
        // @ts-expect-error multer 类型不兼容 Next.js
        this.uploaderSingle(req, res, (error: Error | null) => {
          if (error) {
            return reject(error);
          }

          // @ts-expect-error multer 扩展了 req
          const file = req.file as FileType;

          if (!file) {
            return reject(new Error('No file uploaded'));
          }

          resolve({
            file: {
              ...file,
              originalname: decodeURIComponent(file.originalname)
            },
            metadata: (() => {
              // @ts-expect-error multer 扩展了 req.body
              if (!req.body?.metadata) return {};
              try {
                // @ts-expect-error multer 扩展了 req.body
                return JSON.parse(req.body.metadata);
              } catch {
                return {};
              }
            })(),
            data: (() => {
              // @ts-expect-error multer 扩展了 req.body
              if (!req.body?.data) return {} as T;
              try {
                // @ts-expect-error multer 扩展了 req.body
                return JSON.parse(req.body.data) as T;
              } catch {
                return {} as T;
              }
            })()
          });
        });
      });
    }
  }

  return new UploadModel();
};
