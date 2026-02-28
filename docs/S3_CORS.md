# S3 CORS for uploads bucket

The frontend (e.g. served from CloudFront) uses the uploads S3 bucket in two ways: **PUT** to a presigned URL (upload) and **GET** (playback). Browsers enforce CORS: the bucket must respond with `Access-Control-Allow-Origin` and allow the right methods (PUT, GET, HEAD) or the request is blocked.

## One-time fix (existing bucket)

If you see:

```text
Access to XMLHttpRequest at 'https://...s3.amazonaws.com/...' from origin 'https://...cloudfront.net'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

apply CORS to your upload bucket once. The config must allow **PUT** (presigned upload from the browser) and **GET**/**HEAD** (playback):

```bash
# Replace BUCKET_NAME with your bucket (e.g. hte-anontokyo-uploads-675177356722)
aws s3api put-bucket-cors --bucket BUCKET_NAME --cors-configuration '{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD", "PUT"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["Content-Length", "Content-Range", "Accept-Ranges", "ETag"]
    }
  ]
}'
```

Example with your bucket name:

```bash
aws s3api put-bucket-cors --bucket hte-anontokyo-uploads-675177356722 --cors-configuration '{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD", "PUT"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["Content-Length", "Content-Range", "Accept-Ranges", "ETag"]
    }
  ]
}'
```

Use the same AWS profile/region as the bucket (e.g. `us-east-1`). After this, reload the page; video playback from presigned URLs should work from your CloudFront origin.

## New setups

`.aws/setup-infra.sh` now sets this CORS configuration on the upload bucket automatically when you run it.
