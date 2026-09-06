import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Wraps the S3 / MinIO SDK.
 *
 * Works with any S3-compatible object store. For MinIO set:
 *   STORAGE_ENDPOINT=http://localhost:9000
 *   STORAGE_USE_PATH_STYLE=true   (required — MinIO uses path-style URLs)
 *
 * For AWS S3 omit STORAGE_ENDPOINT and STORAGE_USE_PATH_STYLE.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService) {
    const endpoint  = config.get<string>('STORAGE_ENDPOINT');
    const accessKey = config.get<string>('STORAGE_ACCESS_KEY');
    const secretKey = config.get<string>('STORAGE_SECRET_KEY');
    const region    = config.get<string>('STORAGE_REGION') ?? 'us-east-1';
    this.bucket     = config.get<string>('STORAGE_BUCKET') ?? 'delta-signal';
    const usePathStyle = config.get<string>('STORAGE_USE_PATH_STYLE') !== 'false';

    // Public URL used to build the object's address in responses.
    // Defaults to the MinIO endpoint + bucket path when no override is set.
    this.publicBaseUrl =
      config.get<string>('STORAGE_PUBLIC_URL') ??
      (endpoint ? `${endpoint}/${this.bucket}` : '');

    if (!accessKey || !secretKey) {
      this.client = null;
      this.logger.warn(
        'STORAGE_ACCESS_KEY / STORAGE_SECRET_KEY not set — file upload disabled. ' +
        'Set MinIO or S3 credentials to enable.',
      );
      return;
    }

    this.client = new S3Client({
      region,
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle: usePathStyle,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });

    this.logger.log(
      `Storage client initialised — bucket: ${this.bucket}, ` +
      `endpoint: ${endpoint ?? 'AWS default'}`,
    );
  }

  /** Returns true if the storage backend is configured and reachable. */
  get isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Uploads a file buffer to the bucket under the given key.
   * Returns the public URL of the uploaded object.
   */
  async upload(
    key: string,
    body: Buffer,
    mimeType: string,
    contentDisposition = 'inline',
  ): Promise<string> {
    this.assertConfigured();
    await this.client!.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: mimeType,
        ContentDisposition: contentDisposition,
      }),
    );
    return this.publicUrl(key);
  }

  /** Deletes an object by key. Idempotent — does not throw if the key is absent. */
  async delete(key: string): Promise<void> {
    this.assertConfigured();
    await this.client!.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  /**
   * Creates a presigned PUT URL so the browser can upload directly to the
   * bucket without routing the file bytes through the API server.
   *
   * @param key        Object key (path in the bucket)
   * @param mimeType   Content-Type the client must send in the PUT request
   * @param expiresIn  Seconds until the URL expires (default 15 min)
   */
  async presignPut(
    key: string,
    mimeType: string,
    expiresIn = 900,
  ): Promise<string> {
    this.assertConfigured();
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
    });
    return getSignedUrl(this.client!, command, { expiresIn });
  }

  /** Checks connectivity — throws if the bucket does not exist or is unreachable. */
  async ping(): Promise<void> {
    this.assertConfigured();
    await this.client!.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }

  /** Builds the public URL for an object key. */
  publicUrl(key: string): string {
    const base = this.publicBaseUrl.replace(/\/$/, '');
    return `${base}/${key}`;
  }

  private assertConfigured(): void {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'File storage is not configured. Set STORAGE_ACCESS_KEY and STORAGE_SECRET_KEY.',
      );
    }
  }
}
