# AWS Lambdaで動作するFastAPIのサンプル

AWS Lambdaで動作するFastAPIのサンプルです。

タスクランナーとしてMakefileを採用しています。

- dockerのビルド

```bash
make docker 
``` 

- dockerの実行

```bash
make run
```

- dockerのpush(※ `DOCKER_REPO` は環境変数で指定してください)

```bash
make push
```
