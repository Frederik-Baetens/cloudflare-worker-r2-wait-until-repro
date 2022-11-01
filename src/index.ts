/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	MY_BUCKET: R2Bucket;

	// The name of the Amazon S3 bucket used as the source
	S3_BUCKET_NAME: string;
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		let url = new URL(request.url);
		let filename = url.pathname.split('/').slice(-1)[0];

		if (filename == "") {
			return new Response(undefined, { status: 400 });
		}

		let response = await fetch(
			`https://${env.S3_BUCKET_NAME}.s3.amazonaws.com/${filename}`,
			{
				headers: request.headers,
				cf: { cacheTtl: 14400, },
			}
		);

		if (!(response.ok && response.body)) {
			return response;
		}

		let [fileOne, fileTwo] = response.body.tee();

		console.log("Starting non-blocking upload to R2");
		ctx.waitUntil(
			env.MY_BUCKET.put(filename, fileOne)
				.then(() => console.log("Finished uploading to R2"))
				.catch(() => console.log("Failed to upload to R2"))
		);

		console.log("Returning response");
		return new Response(fileTwo, response);
	}
}
