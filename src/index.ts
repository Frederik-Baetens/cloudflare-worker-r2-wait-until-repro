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
		
		console.log('before fetch ', Date.now())

		let response = await fetch(`https://scuddb.net/${filename}`);

		console.log('done with fetch ', Date.now())

		if (!(response.ok && response.body)) {
			return response;
		}

		let [fileOne, fileTwo] = response.body.tee();

		const { readable, writable } = new TransformStream();
		//fileOne.pipeTo(writable);

		const putFilename = `${filename}_copy`
		//console.log("Starting non-blocking upload to R2");
		//env.scudbucket.put(putFilename, fileOne)
		//	.then(() => console.log("Finished uploading to R2"))
		//	.catch(() => console.log("Failed to upload to R2"))
		
		ctx.waitUntil(consume(fileTwo));

		console.log("Returning response");
		return new Response(fileOne, response);
		//return new Response(readable, response);
	}
}

async function consume(readable: ReadableStream) {
  const interval = setInterval(logTime, 1000);
  let total = 0;
  for await (const chunk of readable) {
    //console.log("chunk", chunk.byteLength);
    total += chunk.byteLength;
  }
  clearInterval(interval)
  console.log("done", total);
}

function logTime() {
	console.log(Date.now())
}

async function consumeAtLeast(readable: ReadableStream) {
  const reader = readable.getReader({ mode: 'byob' });
  let ab = new ArrayBuffer(64000000);
  let total = 0;
  for (;;) {
    const res = await reader.readAtLeast(64000000, new Uint8Array(ab));
    if (res.done) break;
    total += res.value.byteLength;
    //console.log("...", total);
    ab = res.value.buffer;
  }
  console.log("Done", total);
}
