#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
APP_NAME="hte-anontokyo"
LAMBDA_FUNCTION_NAME="hte-anontokyo-api-image"
LAMBDA_ROLE_NAME="hte-anontokyo-lambda-role"
DIST_COMMENT="hte-anontokyo-lambda-image-cdn"
ECR_REPO="hte-anontokyo"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${LAMBDA_ROLE_NAME}"
LOG_GROUP="/aws/lambda/${LAMBDA_FUNCTION_NAME}"
S3_UPLOAD_BUCKET="${S3_UPLOAD_BUCKET:-${APP_NAME}-uploads-${ACCOUNT_ID}}"
DDB_TABLE_NAME="${DDB_TABLE_NAME:-${APP_NAME}-events}"

echo "=== HTE AnonTokyo Lambda + CloudFront Setup ==="
echo "Region: $REGION | Account: $ACCOUNT_ID"
echo ""

# ── 1. IAM role for Lambda ──────────────────────────────────────────────────
echo "1) Ensuring IAM role exists: ${LAMBDA_ROLE_NAME}"
if ! aws iam get-role --role-name "$LAMBDA_ROLE_NAME" >/dev/null 2>&1; then
  aws iam create-role \
    --role-name "$LAMBDA_ROLE_NAME" \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "lambda.amazonaws.com"},
        "Action": "sts:AssumeRole"
      }]
    }' >/dev/null
fi

aws iam attach-role-policy \
  --role-name "$LAMBDA_ROLE_NAME" \
  --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" \
  >/dev/null || true

echo "   Role ready: $ROLE_ARN"

# ── 1b. Ensure S3 permissions for direct upload workflow ─────────────────────
echo "1b) Ensuring IAM policy allows S3 upload/download"
aws iam put-role-policy \
  --role-name "$LAMBDA_ROLE_NAME" \
  --policy-name "${APP_NAME}-s3-upload-access" \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [
      {
        \"Effect\": \"Allow\",
        \"Action\": [\"s3:GetObject\", \"s3:PutObject\", \"s3:DeleteObject\"],
        \"Resource\": \"arn:aws:s3:::${S3_UPLOAD_BUCKET}/*\"
      },
      {
        \"Effect\": \"Allow\",
        \"Action\": [\"s3:ListBucket\"],
        \"Resource\": \"arn:aws:s3:::${S3_UPLOAD_BUCKET}\"
      }
    ]
  }" >/dev/null

echo "1c) Ensuring IAM policy allows DynamoDB event persistence"
aws iam put-role-policy \
  --role-name "$LAMBDA_ROLE_NAME" \
  --policy-name "${APP_NAME}-ddb-events-access" \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [
      {
        \"Effect\": \"Allow\",
        \"Action\": [\"dynamodb:PutItem\", \"dynamodb:Scan\", \"dynamodb:Query\", \"dynamodb:DescribeTable\"],
        \"Resource\": \"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${DDB_TABLE_NAME}\"
      }
    ]
  }" >/dev/null

# ── 2. Ensure S3 bucket + CloudWatch log group exists ────────────────────────
echo "2) Ensuring upload bucket exists: ${S3_UPLOAD_BUCKET}"
if ! aws s3api head-bucket --bucket "$S3_UPLOAD_BUCKET" >/dev/null 2>&1; then
  if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$S3_UPLOAD_BUCKET" >/dev/null
  else
    aws s3api create-bucket \
      --bucket "$S3_UPLOAD_BUCKET" \
      --create-bucket-configuration "LocationConstraint=${REGION}" >/dev/null
  fi
fi

# ── 2b. CORS on S3: presigned PUT (upload) + GET (playback) from browser ───────
echo "2b) Setting CORS on upload bucket (allow PUT/GET/HEAD from any origin)"
CORS_FILE="$(mktemp)"
cat > "$CORS_FILE" <<'CORSJSON'
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD", "PUT"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["Content-Length", "Content-Range", "Accept-Ranges", "ETag"]
    }
  ]
}
CORSJSON
aws s3api put-bucket-cors --bucket "$S3_UPLOAD_BUCKET" --cors-configuration "file://${CORS_FILE}" 2>/dev/null || true
rm -f "$CORS_FILE"

echo "2c) Ensuring DynamoDB table exists: ${DDB_TABLE_NAME}"
if ! aws dynamodb describe-table --table-name "$DDB_TABLE_NAME" --region "$REGION" >/dev/null 2>&1; then
  aws dynamodb create-table \
    --table-name "$DDB_TABLE_NAME" \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "$REGION" >/dev/null
  aws dynamodb wait table-exists --table-name "$DDB_TABLE_NAME" --region "$REGION"
fi

echo "2d) Ensuring log group exists: ${LOG_GROUP}"
if ! aws logs describe-log-groups \
  --region "$REGION" \
  --log-group-name-prefix "$LOG_GROUP" \
  --query "logGroups[?logGroupName=='$LOG_GROUP'] | length(@)" \
  --output text | grep -q '^1$'; then
  aws logs create-log-group --log-group-name "$LOG_GROUP" --region "$REGION" >/dev/null
fi

# ── 3. Ensure ECR repo + image-based Lambda exists ───────────────────────────
echo "3) Ensuring Lambda function exists: ${LAMBDA_FUNCTION_NAME}"
if ! aws ecr describe-repositories --repository-names "$ECR_REPO" --region "$REGION" >/dev/null 2>&1; then
  aws ecr create-repository \
    --repository-name "$ECR_REPO" \
    --region "$REGION" >/dev/null
fi

LATEST_TAG="$(aws ecr describe-images \
  --repository-name "$ECR_REPO" \
  --region "$REGION" \
  --query 'sort_by(imageDetails,&imagePushedAt)[-1].imageTags[0]' \
  --output text 2>/dev/null || true)"

if [ -z "$LATEST_TAG" ] || [ "$LATEST_TAG" = "None" ]; then
  echo "   No image tags found in ECR repo '$ECR_REPO'."
  echo "   Push at least one image first, then re-run this script."
  exit 1
fi

IMAGE_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO}:${LATEST_TAG}"
if ! aws lambda get-function --function-name "$LAMBDA_FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
  aws lambda create-function \
    --function-name "$LAMBDA_FUNCTION_NAME" \
    --package-type Image \
    --code "ImageUri=${IMAGE_URI}" \
    --role "$ROLE_ARN" \
    --timeout 900 \
    --memory-size 2048 \
    --region "$REGION" >/dev/null
fi
echo "   Lambda ready: ${LAMBDA_FUNCTION_NAME}"

# ── 4. Function URL (public) ─────────────────────────────────────────────────
echo "5) Ensuring Lambda Function URL exists"
if ! aws lambda get-function-url-config \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --region "$REGION" >/dev/null 2>&1; then
  aws lambda create-function-url-config \
    --function-name "$LAMBDA_FUNCTION_NAME" \
    --auth-type NONE \
    --cors "AllowOrigins=['*'],AllowMethods=['*'],AllowHeaders=['*']" \
    --region "$REGION" >/dev/null
fi

aws lambda add-permission \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --statement-id "FunctionURLAllowPublic" \
  --action "lambda:InvokeFunctionUrl" \
  --principal "*" \
  --function-url-auth-type NONE \
  --region "$REGION" >/dev/null 2>&1 || true

# Required since Oct 2025: both InvokeFunctionUrl and InvokeFunction
aws lambda add-permission \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --statement-id "FunctionURLInvokeFunction" \
  --action "lambda:InvokeFunction" \
  --principal "*" \
  --invoked-via-function-url \
  --region "$REGION" >/dev/null 2>&1 || true

FUNCTION_URL="$(aws lambda get-function-url-config \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --region "$REGION" \
  --query FunctionUrl \
  --output text)"
FUNCTION_HOST="$(echo "$FUNCTION_URL" | sed -E 's#https://([^/]+)/?#\1#')"
echo "   Function URL: $FUNCTION_URL"

# ── 5. CloudFront distribution ───────────────────────────────────────────────
echo "5) Ensuring CloudFront distribution exists"
DIST_ID="$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='${DIST_COMMENT}'].Id | [0]" \
  --output text)"

if [ "$DIST_ID" = "None" ] || [ -z "$DIST_ID" ]; then
  CFG_FILE="$(mktemp)"
  cat > "$CFG_FILE" <<JSON
{
  "CallerReference": "${APP_NAME}-$(date +%s)",
  "Comment": "${DIST_COMMENT}",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "lambda-url-origin",
      "DomainName": "${FUNCTION_HOST}",
      "OriginPath": "",
      "CustomHeaders": {"Quantity": 0},
      "CustomOriginConfig": {
        "HTTPPort": 80,
        "HTTPSPort": 443,
        "OriginProtocolPolicy": "https-only",
        "OriginSslProtocols": {
          "Quantity": 1,
          "Items": ["TLSv1.2"]
        },
        "OriginReadTimeout": 30,
        "OriginKeepaliveTimeout": 5
      }
    }]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "lambda-url-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 7,
      "Items": ["GET","HEAD","OPTIONS","PUT","PATCH","POST","DELETE"],
      "CachedMethods": {
        "Quantity": 3,
        "Items": ["GET","HEAD","OPTIONS"]
      }
    },
    "Compress": true,
    "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
    "OriginRequestPolicyId": "b689b0a8-53d0-40ab-baf2-68738e2966ac"
  },
  "PriceClass": "PriceClass_100"
}
JSON
  DIST_ID="$(aws cloudfront create-distribution \
    --distribution-config "file://${CFG_FILE}" \
    --query 'Distribution.Id' \
    --output text)"
  rm -f "$CFG_FILE"
fi

CF_DOMAIN="$(aws cloudfront get-distribution \
  --id "$DIST_ID" \
  --query 'Distribution.DomainName' \
  --output text)"

echo ""
echo "=== Setup complete ==="
echo "Lambda Function:            ${LAMBDA_FUNCTION_NAME}"
echo "Lambda Function URL:        ${FUNCTION_URL}"
echo "CloudFront Distribution ID: ${DIST_ID}"
echo "CloudFront Domain:          https://${CF_DOMAIN}"
echo ""
echo "GitHub Secrets (Settings → Secrets and variables → Actions):"
echo "  AWS_ACCESS_KEY_ID       - AWS deployer access key"
echo "  AWS_SECRET_ACCESS_KEY   - AWS deployer secret key"
echo "  ELEVENLABS_API_KEY     - ElevenLabs API key (Speech-to-Text)"
echo "  GEMINI_API_KEY         - Google Gemini API key (body language, rubric)"
echo "  MINIMAX_API_KEY        - Minimax API key (AI feedback)"
echo "  S3_UPLOAD_BUCKET       - S3 bucket for large direct uploads (default: ${S3_UPLOAD_BUCKET})"
echo "  S3_UPLOAD_REGION       - S3 bucket region (default: ${REGION})"
echo "  S3_UPLOAD_PREFIX       - Object prefix, e.g. uploads"
echo "  DDB_TABLE_NAME         - DynamoDB table for generation history (default: ${DDB_TABLE_NAME})"
echo "  CLOUDFRONT_DISTRIBUTION_ID = ${DIST_ID}"
