# Cloudflare Worker + R2 + .tee repro

### Setup

You'll need:
* 1 Amazon S3 bucket
* 1 Cloudflare R2 bucket

Modify the `wrangler.toml` config with the names of your buckets.

Upload a large-ish file to S3 (100MB):

```sh
dd if=/dev/zero of=testfile bs=1024 count=102400
aws s3 cp ./test s3://<S3_BUCKET_NAME>/<filename>
```

### Reproduce

First run the worker in dev mode. It should serve the file from S3 and begin a non-blocking upload to R2.

```sh
wrangler dev
curl http://127.0.0.1:8787/<filename> -D - -o /dev/null
```

Here's the expected response in the logs:

```
Starting non-blocking upload to R2
Returning response
9:13:15 PM GET /100MB.nar 200
Finished uploading to R2
```

Now publish the worker to Cloudflare and fetch the file:

```sh
wrangler publish
wrangler tail

curl https://<subdomain>.workers.dev/<filename> -D - -o /dev/null
```

The file never gets uploaded to R2:

```
(log) Starting non-blocking upload to R2
(log) Returning response
```

If we generate data on the Worker and avoid tee, everything works as expected:

```javascript
let data = new ArrayBuffer(100 * Math.pow(10, 6));
```
