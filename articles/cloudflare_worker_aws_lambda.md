---
title: "AWS Lambdaの関数をAWS外部(Cloudflareなど)から呼び出す"
emoji: "⚡"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ['aws', 'lambda', 'cloudflare', 'aws4fetch']
published: true
---

AWS Lambdaの関数をIAMの認証付きでAWS外部から呼び出す方法を紹介します。

使用する言語はJavaScriptです。

Cloudflare Workerでサーバー機能を実装していたのですが、どうしても制限が厳しく、全てをCloudflare Workerで実装するのは難しかったので、一部のサーバー処理をAWS Lambdaで実装し、Cloudflare Workerから呼び出すことにしました。

今回はその備忘録です。

今回のサンプルコード

https://github.com/Ouvill/cloudflare_worker_aws_lambda_samplel

## この記事でやること

- AWS LambdaにDockerイメージをデプロイする
- AWS LamdbaのCloudURLを取得する
- AWS IAMでユーザーを作成する
- AWS IAMでユーザーにポリシーを付与する
- Cloudflare WorkerでAWS Lambdaを呼び出す

## AWS Lambdaの関数を作成する

今回はサンプルとしてPythonのFastAPIを使ってlambdaを実装します。(特別なことはやらないので、自前でlambdaを作成できる人は読み飛ばしてください。)

lambda用にサーバーコードを記述するのではなく、AWS Lambda Web Adapterを使ってFastAPIをAWS Lambdaにデプロイします。

パッケージ管理には[uv](https://docs.astral.sh/uv/)を利用します。好みに応じて他のパッケージ管理ツールを利用しても構いません。

uvをインストール

```bash
https://docs.astral.sh/uv/
```

uvでプロジェクトを作成

```bash
uv init fastapi_sample
cd fastapi_sample
```

必要なパッケージをインストール

```bash
uv add fastapi
uv add uvicorn[standard]
```

FastAPIのサンプルをmain.pyに作成

```python:main.py
from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "q": q}
```

FastAPIの公式に紹介されている簡単なFastAPIのサンプルです。`/`と`/items/{item_id}`のエンドポイントがあります。

これをDockerイメージにしてAWS Lambdaにデプロイできるようにします。

[AWS Lambda Web Adapter](https://github.com/awslabs/aws-lambda-web-adapter) を利用すると、FastAPIをほぼそのままAWS Lambdaで動かせます。

```Dockerfile: Dockerfile
FROM public.ecr.aws/docker/library/python:3.12-slim

# Expose the port the app runs on
ENV PORT=8000
ENV XDG_CACHE_HOME=/tmp/.cache

# Install uv and the Lambda Web Adapter
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 /lambda-adapter /opt/extensions/lambda-adapter

# Copy the project into the image
ADD . /app

# Sync the project into a new environment, using the frozen lockfile
WORKDIR /app
RUN uv sync --frozen

# Command to run the application
CMD uv run uvicorn main:app --host 0.0.0.0 --port ${PORT}

```

9行目でAWS Lambda Web Adapterをインストールしています。Lambdaの入力をHTTPリクエストに変換してくれます。Rustで実装されており遅延が少ないです。

```
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 /lambda-adapter /opt/extensions/lambda-adapter
```

このDockerfileをビルドします。

```bash
docker build -t fastapi_sample .
```

以上でAWS LambdaにデプロイするDockerイメージができました。

Dockerイメージを実行する場合、以下のようになります。

```bash
docker run -it -p 8000:8000 --rm fastapi_sample
```

## AWS LambdaにDockerイメージをデプロイする

AWS LambdaにDockerイメージをデプロイするには、ECRにDockerイメージをpushし、そのイメージをLambdaにデプロイします。

ECRはAWSのコンテナレジストリです。

AWSのコンソールからECRを開き、リポジトリを作成します。名前は任意です。`sample/fast-api-sample`としました。

![alt text](/images/cloudflare_worker_aws_lambda/create_repository.png)

リポジトリが作成されたら、先程作成したリポジトリを選択し、「View push commands」をクリックします。

![alt text](/images/cloudflare_worker_aws_lambda/repository_list.png)

表示されたコマンドを実行します。

- ECRのリポジトリにログイン

```bash
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin **********.dkr.ecr.ap-northeast-1.amazonaws.com
```

- Docker ビルド

```bash
docker build -t fastapi_sample .
```

- Docker タグ付け

```bash
docker tag fastapi_sample:latest **********.dkr.ecr.ap-northeast-1.amazonaws.com/fastapi_sample:latest
```

- Docker イメージをECRにプッシュ

```bash
docker push **********.dkr.ecr.ap-northeast-1.amazonaws.com/fastapi_sample:latest
```

## AWS Lambdaをデプロイ

AWS Lambdaをデプロイします。Lambdaのページを開き、「Create function」をクリックします。「Container image」を選択し、先程作成したECRのイメージを選択します。

![alt text](/images/cloudflare_worker_aws_lambda/create_lambda.png)

「Create function」をクリックしLambdaを作成します。

## AWS LambdaのCloudURLを作成する。

AWS LambdaにはFunction URLという機能があります。Lambda関数にそれぞれ独立したURLが発行され、そのURLを使ってLambda関数を呼び出せます。今回はこのFunction  URLを使ってCloudflare WorkerからLambda関数を呼び出します。

作成したLambda関数のページから「Configuration」タブを開きます。

「Function URL」をクリックし、「Create Function URL」をクリックします。

![alt text](/images/cloudflare_worker_aws_lambda/configure_function_url.png)

設定画面が表示されるので、AWS_IAMを選択し「Save」をクリックします。

![alt text](/images/cloudflare_worker_aws_lambda/configure_function_url_2.png)

Function URLが作成されます。

次のステップを行うために、Lambda関数のARNをメモしておきます。

## AWS IAMでFunction URLを呼び出せるPolicyを作成する。

Function URLを呼び出すためのPolicyを作成します。

IAM -> Policies -> Create policy をクリックします。

![alt text](/images/cloudflare_worker_aws_lambda/create_policy.png)

`InvokeFunctionUrl`の権限を付与します。

ARNには先程メモしたLambda関数のARNを入力します。

次に、このポリシーをアタッチするIAMユーザーを作成します。

IAM -> Users -> Create user をクリックします。

![alt text](/images/cloudflare_worker_aws_lambda/create-user.png)

先程作成したポリシーをアタッチします。

ユーザーを作成したら、「Create Access Key」をクリックし、アクセスキーを取得します。

`Application running on outside AWS`を選択します。

![alt text](/images/cloudflare_worker_aws_lambda/create_access_key.png)

Create Access Key をクリックし、アクセスキーを取得します。

標示されたアクセスキーとシークレットキーをメモしておきます。

## aws4fetchを使ってAWS Lambdaを呼び出す

[aws4fetch](https://github.com/mhart/aws4fetch)を使ってAWS Lambdaを呼び出します。

aws4fetchはAWSのリクエストを署名してくれるライブラリです。fetch APIと同じように利用でき汎用性が高いです。

```bash
npm install aws4fetch
```

以下のようなコードで利用します。

```typescript
import { AwsClient } from 'aws4fetch'

const aws = new AwsClient({ accessKeyId: MY_ACCESS_KEY, secretAccessKey: MY_SECRET_KEY })

// https://docs.aws.amazon.com/lambda/latest/dg/API_Invoke.html
const LAMBDA_FN_API = 'https://lambda.us-east-1.amazonaws.com/2015-03-31/functions'

async function invokeMyLambda(event) {
  const res = await aws.fetch(`${LAMBDA_FN_API}/my-lambda/invocations`, { body: JSON.stringify(event) })

  // `res` is a standard Response object: https://developer.mozilla.org/en-US/docs/Web/API/Response
  return res.json()
}

invokeMyLambda({my: 'event'}).then(json => console.log(json))
```

## Hono on Cloudflare WorkerでAWS4fetchを使ってAWS Lambdaを呼び出す

Cloudflare Workerで動作するHonoからAWS Lambdaを呼び出すコードを書いてみます。

honoのコードを作成します。

```typescript
npm create hono@latest
```

プロジェクト名を適当に入力し`cloudflare-workers`を選択します。今回のプロジェクト名は`worker-sample`とします。

```bash
cd worker-sample
```

AWSのアクセスキーIDとシークレットキーを環境変数から渡すことにします。hono on cloudflare workerから環境変数を取得する場合はhonoの`c.env`を使います。

```typescript
import { Hono } from 'hono'
import { AwsClient } from "aws4fetch"
import { HonoType } from './type'

const lambdaUrl = "https://5n3bv5p7q3amtcg7fonyvbtssy0gvwnx.lambda-url.ap-northeast-1.on.aws/"

const app = new Hono<HonoType>()
  .get('/', (c) => {
    // const client = newAws4Client(c)
    const client = new AwsClient({
      accessKeyId: c.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: c.env.AWS_SECRET_ACCESS_KEY,
    })

    return client.fetch(lambdaUrl)
  });

export default app
```

環境変数を設定します。

ローカル環境の場合は`.dev.vars`というファイルに環境変数を設定します。

```bash
AWS_ACCESS_KEY_ID=**************
AWS_SECRET_ACCESS_KEY=*****************************
```

本番環境ではCloudflareのダッシュボードから環境変数を設定できます。

## 動作確認

動作確認します。ローカルで動作させる場合は以下のコマンドを実行します。

```bash
npm run dev
```

ブラウザで`http://localhost:8787`にアクセスし、AWS Lambdaのレスポンスが返ってくれば成功です。

以上でAWS LambdaをAWS外部(Cloudflare Worker)から呼び出す方法を紹介しました。

## まとめ

AWS LambdaにDockerイメージをデプロイし、Cloudflare Workerから呼び出す方法を紹介しました。
ポイントは以下です。

- AWS LambdaにFunction URLを作成する
- AWS IAMで`InvokeFunctionUrl`の権限を付与すること
- aws4fetchを利用してAWS Lambdaを呼び出すこと

## 所管

Cloudflare Workerは結構制限が厳しいのですが、AWSやGCPのサービスと連携し、マイクロサーバーアーキテクチャを構築することで、制限を回避できると思います。

今回は説明のためにGUIで操作しましたが、TerraformやOpenTofu, 
AWS CloudFormationなどを利用してAWSの設定をコード化することをおすすめします。
