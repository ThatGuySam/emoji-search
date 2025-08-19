import { AwsClient } from 'aws4fetch'

import { env } from '../env'

/**
 * Upserts an object to R2 (create or overwrite).
 * 
 * ```ts
 * await upsertObject({
 *   bucket: env.R2_BUCKET!,
 *   key: 'notes/a.txt',
 *   body: Buffer.from('hello'),
 *   contentType: 'text/plain',
 * });
 * ```
 * @param opts - The options for the object.
 * @param opts.bucket - The bucket to upsert the object to.
 * @param opts.key - The key of the object.
 * @param opts.body - The body of the object.
 * @param opts.contentType - The content type of the object.
 */
export async function upsertObject(opts: {
  bucket?: string;
  key: string;
  body:
    | Buffer
    | Uint8Array
    | string
    | ReadableStream<any>;
  contentType?: string;
}) {
    const { bucket = env.R2_BUCKET } = opts

    const R2 = `https://${env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`
    const aws = new AwsClient({
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        service: 's3',
        region: 'auto'
    })

    await aws.fetch(`${R2}/${bucket}/${opts.key}`, {
        method: 'PUT',
        body: opts.body,
    })
}
