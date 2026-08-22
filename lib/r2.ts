import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 is S3-API-compatible, so the regular AWS SDK works against
// it — just point the endpoint at the account's R2 URL.
function getClient() {
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error("R2_ACCOUNT_ID is not set");
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });
}

function getBucket() {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME is not set");
  return bucket;
}

/** Presigned PUT URL the browser can upload the PDF bytes to directly. */
export async function presignUploadUrl(key: string, contentType: string) {
  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: 60 * 10 });
}

/** Presigned GET URL the browser (react-pdf) can fetch the PDF bytes from
 *  directly, without routing them through our server. The R2 bucket needs
 *  a CORS rule allowing GET from the app's origin — see README. */
export async function presignGetUrl(key: string) {
  const client = getClient();
  const command = new GetObjectCommand({ Bucket: getBucket(), Key: key });
  return getSignedUrl(client, command, { expiresIn: 60 * 10 });
}

/** Server-side upload, used for files the server already has bytes for
 *  (e.g. PDFs downloaded from the aula virtual sync). */
export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
) {
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const client = getClient();
  const result = await client.send(
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
  );
  const bytes = await result.Body?.transformToByteArray();
  if (!bytes) throw new Error(`Object ${key} has no body`);
  return Buffer.from(bytes);
}

export async function deleteObject(key: string) {
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key }),
  );
}
