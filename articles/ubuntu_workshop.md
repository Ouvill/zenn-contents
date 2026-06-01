---
title: "隔離された開発環境 Workshop を紹介"
emoji: "🧱"
topics: ['linux', 'lxd', 'ai']
---

我々が開発、利用しているパソコンは、個人情報や機密情報を多く含んでいます。情報が流出してしまえば、もしくは消えてしまったり書き換えられてしまえば困ったことになることもあるでしょう。そのため我々は個人情報や機密情報を厳重に扱います。

しかしながら最近はAIの発達によって、私たちのパソコンを操作するのは私たちだけじゃなく、AIもパソコンを操作するようになってきました。便利なAIですが、信頼し切るには頼りないです。Xのタイムラインなどを眺めていると AI が勝手に大切なデータを消してしまったというつぶやきなども時々見かけます。

また、AIのほかに npm や pip, cargo　などのパッケージマネージャー経由で悪意あるパッケージが混入し、パソコンに保存されたAPIキーが流出したりするサプライチェーン攻撃なども頻発するようになっています。

つまり、私達は以下のような脅威にそなえなければいけません。

- AI の誤動作、プロンプトインジェクションなどによる AI によるシステム破壊、情報流出
- npm, pip, cargo のパッケージマネージャー経由の悪意あるパッケージの侵害による機密情報流出

システム開発をするときのことを考えると、システム開発用の開発ツールやAIはパソコンすべてのリソースにアクセスする必要はありません。そのシステムを開発するのに必要なリソースにだけアクセスできればいいはずです。

今回、この記事で紹介するのは Canonical 社が開発している Workshop という開発用の隔離コンテナを作成するツールです。ずばり開発に必要なツールだけを仮想環境に

## Workshopとは

Workshopは、LXDをベースにした隔離された開発環境を作成、管理するためのツールです。Ubuntuを開発しているCanonical社によって開発されており、Linux上で簡単に仮想環境を構築できるように設計されています。

LXDはDockerと同様のコンテナ技術を使用しています。Dockerは主にアプリケーションのコンテナ化に焦点を当てているのに対し、LXDはLinuxシステム全体を仮想化することに焦点をおいており、システムコンテナと呼ばれています。

## Workshopの特徴

- Workshopは事前定義された `workshop.yaml` ファイルを使用して開発環境の構成を定義します。
- Workshop を起動したディレクトリは自動的にコンテナ内の `/project` にマウントされ、コードやデータを簡単に共有されます。逆にそれ以外のディレクトリは自動的にマウントされないため、
- 事前定義された Workshop 用の SDK を使用して、機能の追加やカスタマイズが可能です。`codex`, `claude`, `python`, `nodejs`, `hermes-agent`, `opencode`, `comfy` などの SDK が用意されており、開発に必要なツールやライブラリを簡単にインストールできます。devcontainer の features のようなイメージです。
- SDK は Plug, Slot という概念があります。`desktop`, `camera`, `gpu` などが定義されており、各種権限を制限できます。例えば、`desktop` plug をホストOSの system:desktop slot に接続することで、コンテナ内からホストのデスクトップへGUI表示が可能になります。
- 自作の SDK を作成できます。プロジェクトに特化した SDK を作成することも、広く使われることを想定した SDK を作成、配布することも可能です。

## Workshop のメリット

- Workshopを利用することで、AIエージェントの予測不可能な動作や、パッケージマネージャーによるセキュリティリスクからホストOSを保護できます。
- CUDA, ROCm を利用することも想定されており比較的 GPU 連携が簡単です。

## Workshop のデメリット

- まだ新しいソフトのため、SDKの種類が少ないです。少し凝ったことをしようとしたら SDK の自作が必須です
- 隔離環境なのでやっぱりネイティブ動作よりも色々と手間は増えます。

## インストール

snap を使用してインストールします。Ubuntu では snap が標準でインストールされているため、以下のコマンドを実行するだけで Workshop をインストールできます。LXD も snap でインストールします。LXD 6.8 以降が必要です。

```bash
sudo snap install --channel=6/stable lxd
sudo snap install --classic workshop
```

すでに LXD をインストールしている場合は、以下のコマンドで LXD をアップグレードしてください。現在(2026-06-02時点)で最新のLXD 6.8 が必要なので更新してください。

```bash
sudo snap refresh --channel=6/stable lxd
```

## 使い方


:::mesage

詳しい解説は[公式のドキュメント](https://ubuntu.com/workshop/docs/tutorial/part-1-get-started/)を参照してください。

AI 用の SKILL が配布されているのでそちらを SKILL に登録して codex　や claude に聞くのも良いと思います。

```bash
npx skills add https://github.com/canonical/use-workshop-skill
```

:::

workshop を利用して実際に隔離環境を構築し、そこで Ollama を利用してみましょう。workshop コンテナをカスタマイズには、各種ツールのインストール手順や依存関係を記述した SDK を利用します。まず ollama が sdk としてあるか検索します。

```bash
sdk find ollama
```

```text
NAME                      VERSION      PUBLISHER       SUMMARY
cognee                    1.1.2        Matias Piipari  AI memory engine that turns your data into a queryable knowledge graph
hermes-agent              2026.5.29.2  Matias Piipari  Hermes Agent — self-improving AI agent from Nous Research
hindsight                 0.7.1        Matias Piipari  Hindsight agent-memory server, web UI, and client SDKs for Workshop
lemonade-server-workshop  10.6.0       Tejpreet Bal    Local LLM inference server with OpenAI-compatible API (AMD/CPU/NPU)
mem0                      2.0.4        Matias Piipari  The memory layer for AI agents and applications
ollama                    0.24.0       Dmitry Lyfar    Get up and running with large language models
```

ollama の sdk があることが確認できました。sdk のタイトル、発行者(PUBLISHER)、概要(SUMMARY)などが把握できます。

詳細情報を見ます。

```bash
sdk info ollama
```

```txt
name:       ollama
publisher:  Dmitry Lyfar (dlyfar)
license:    MIT

Get up and running with Llama 3.3, DeepSeek-R1, Phi-4,
Gemma 3, Mistral Small 3.1 and other large language models.

CHANNELS
  CHANNEL           VERSION  BUILD       BASE          REV     SIZE
  latest/stable     0.24.0   2026-05-19  ubuntu@24.04   15   1.40GB
                                         ubuntu@22.04   16   1.40GB
  vulkan/stable     0.24.0   2026-05-26  ubuntu@24.04   25  24.94MB
                                         ubuntu@22.04   30  24.94MB
  rocm/stable       0.24.0   2026-05-26  ubuntu@24.04   32   1.14GB
                                         ubuntu@22.04   31   1.14GB
  cuda/stable       0.24.0   2026-05-21  ubuntu@24.04   21   1.40GB
                                         ubuntu@22.04   22   1.40GB
  cpu/stable        0.24.0   2026-05-26  ubuntu@24.04   26  15.92MB
                                         ubuntu@22.04   27  15.92MB
  cpu/candidate     ↑
  cpu/beta          ↑
  cpu/edge          ↑
```

`CHANNELS` 欄に複数のチャンネルが表示されています。`vulkan`, `rocm`, `cuda`, `cpu`など各種ランタイムとともに、`stable`, `candiate`, `beta`, `edge`などのリスクレベルでそれぞれ用意されているようです。今回は `cpu/stable`を利用してみます。

まずプロジェクト用のディレクトリを作成します。

```bash
mkdir ollama-python-project
cd ollama-python-project
git init
```

ディレクトリに移動したら、workshopを設定する`workshop.yaml`を作成します。

```yaml
name: dev
base: ubuntu@22.04
sdks:
  - name: ollama
    channel: cpu/stable
```

`name` は任意の名前です。今回は `dev`としました。
`base` はベースとなるイメージを指定します。`ubuntu@22.04`のほかに`ubuntu@24.04`, `ubuntu@26.04`など指定できます。

では、workshopコンテナを作成、起動してみましょう。

```bash
workshop launch
```

```txt
"dev" launched
```

workshop コンテナがバックグラウンドで立ち上がります。

workshop コンテナの情報を見てみましょう。

```bash
workshop info
```

```txt
name:     dev
base:     ubuntu@22.04
project:  /home/user/ollama-python-project
status:   ready
notes:    –
sdks:
  system:
    installed:  (1)
  ollama:
    tracking:   cpu/stable
    installed:  0.24.0  2026-05-26  (26)
    mounts:
      models:
        host-source:      …/b5d2eb7a/dev/mount/ollama/models
        workshop-target:  /home/workshop/.ollama/models
```

ollama が sdk にインストールされていることがわかります。また`mounts`によって workshop の `home/workshop/.ollama/models` フォルダが `/…/b5d2eb7a/dev/mount/ollama/models`にマウントされていることがわかります。詳細については https://ubuntu.com/workshop/docs/tutorial/part-2-work-with-interfaces/#tut-interfaces を参照してください。

workshop コンテナが起動したあとは`.workshop.lock`ファイルが作成されています。これは Workshop がプロジェクトを追跡するためのものなので削除しないでください。これは個人用のファイルでもあるので git リポジトリにも追加しないでください。`.gitignore`に追加しておきましょう。

```bash
echo ".workshop.lock" >> .gitignore
```

workshop は launch コマンドで自動で起動しますが、明示的に起動、停止を行えます。

```bash
workshop start
```

もしくは停止する場合は

```bash 
workshop stop
```

### Workshop を再構築する

workshop.yaml に記述された SDK や base イメージはそれぞれのPublisher が更新することがあります。また、あなた自身も workshop.yaml に base や SDK を追加、削除など編集することもあるでしょう。

先程の workshop.yaml を以下のように更新します。

```workshop.yaml
name: dev
base: ubuntu@24.04
sdks:
  - name: ollama
    channel: vulkan/stable
```

ubuntu のベースイメージを新しくしたのと、ollamaをvulkan対応に切り替えます。

変更を反映し、workshop を再構築します。

```bash
workshop refresh
```

`workshop refresh` が失敗したときは以前のバージョンにロールバックします。

### コマンドを実行する

workshop を作成、起動することはできたので、次は workshop からコマンドを実行しましょう

まずは、例として workshop へ小さな AI model `tinyllama` をダウンロードして、実行してみましょう

```bash
workshop exec dev -- ollama run tinillama
```

ダウンロードした`tinyllama`はマウントされた`models/`に保存されます。これは workshop refresh したときも削除されず永続化されます。Ollamaの操作を終了するときは`Ctrl + D`を入力してください。

ダウンロードしたモデルは以下のコマンドで確認できます。

```bash
workshop exec dev -- ollama list
```

```txt
NAME                ID              SIZE      MODIFIED
tinyllama:latest    2644915ede35    637 MB    2 minutes ago
```

workshop を通じてインストールされたツールは workshop によって管理され、ホストシステムを汚染することはありません。

### Shell に入る

以下のコマンドによって workshop コンテナのシェル環境に入ることができます。Workshop は `workshop`という一般ユーザーでログインシェルを実行します。

```bash
$ workshop shell

workshop@dev-b5d2eb7a:/project$ pwd
/project
workshop@dev-b5d2eb7a:/project$ lsb_release -a
No LSB modules are available.
Distributor ID:	Ubuntu
Description:	Ubuntu 24.04.4 LTS
Release:	24.04
Codename:	noble
workshop@dev-b5d2eb7a:/project$ exit
exit
```

### プロジェクトディレクトリの読み書き

プロジェクトディレクトリは workshop が起動したときに `/project/` にマウントされます。workshop 内で編集した内容はホストに反映されますし、ホストが編集した内容も workshop 内で確認できます。

```bash
touch created_outside.txt
workshop exec dev -- ls /project/

  ...  created_outside.txt  ...

workshop exec dev -- touch /project/created_inside.txt
ls

  ...  created_inside.txt  created_outside.txt  ...
```

### workshop の変更を確認する

Workshop がどのようにプロジェクトの変更を追跡しているか確認するために、最近の主要なオペレーションや変更を`workshop changes`でチェックできます。

```bash
workshop changes
```

```txt
ID  STATUS  SPAWN               READY               SUMMARY
  1   Done    today at 09:26 CET  today at 09:27 CET  Launch "dev" workshop
  ...
  4   Done    today at 09:32 CET  today at 09:34 CET  Refresh "dev" workshop
```

それぞれの変更の詳細は以下のコマンドで確認できます。

```bash
workshop tasks 4
```

```txt
STATUS   DURATION  SUMMARY
Done    2m17.389s  Download "ubuntu@24.04" base image
Done        113ms  Retrieve "system" SDK
Done    2m59.777s  Retrieve "ollama" SDK from channel "vulkan/stable"
Done        443ms  Create SDK state storage
Done        581ms  Run hook "save-state" for "system" SDK
Done        449ms  Run hook "save-state" for "ollama" SDK
Done         54ms  Disconnect interfaces of "ollama" SDK
...
Done        528ms  Setup "system" SDK profile
```

---

以上がざっくりとした workshop の使い方です。

更に使いこなすには、公式のドキュメントを参照してください

https://ubuntu.com/workshop/docs/tutorial/part-1-get-started/

## 触ってみた感想

実際に公式ドキュメントをざっと読んでみて、色々と workshop のコンテナを作成してみました。実際に動かしてみて思ったのは以下のようなことです。

- 結構簡単に隔離環境を用意できるのは良いです。
- SDK 側で永続化が必要なデータを指定できる、されているので、SDK を利用する側はコンフィグファイルなどの永続化を気にしないでいいから楽です。
- 一度インストールした SDK はある程度キャッシュが効くので、`workshop refresh`のコンテナ再構築がそこそこ速いです。
- 隔離環境としては Docker/Podman などが利用されがちですが、開発環境として複数プロセスを起動することも考えるとシステムコンテナの LXD はスジがいいと思います。
- ホスト側のリソースにアクセスさせたいときは、workshop利用者が明示的に　`workshop connect <workshop>/sdk:plug`や `workshop remount <workshop/sdk:plug <hostpath>`などコマンドを入力しないといけないのはセキュリティ的に良いです。例えば `docker compose`　などを中身を確認せずに実行すると、ホストの `/` を docker コンテナにマウントされてすべてのデータを持っていかれることもありえますが、workshop 単独ならそれはおこりえません。

## 触ってみた不満点

- デメリットにも書きましたが、まだまだ SDK が少ないのでツール追加するには自前で SDK を定義する必要があります。
- 自前定義の方法については [Customize with sketch SDKs](https://ubuntu.com/workshop/docs/tutorial/part-3-sketch-sdks/) や [Craft SDKs with SDKcraft](https://ubuntu.com/workshop/docs/tutorial/part-4-craft-sdks/)で説明されています。
- SDK の中身が把握しにくいです。 workshop の拡張は SDK に依存しているのですが、その SDK がどのように作成されているのか把握しにくいです。`sdk info`でSDKの情報を確認できますが、SDK の概要、SDKのパッケージは誰が作ったのかというのがわかるくらいです。git リポジトリやホームページの情報は取得できません。信頼できる SDK なのかどうか判断が難しいです。README.md にもたどり着けないので SDK の使い方を把握するのに苦労します。
- 一応 workshop コンテナにインストールされた　SDK は workshop コンテナの `/var/lib/workshop/sdk/****` にそれぞれ保存されるので、そこでコードなどを一部確認できます。

## まとめ

- Canonical社が新しく発表した Workshop というツールについてでした。
- workshop.yaml を定義し、`workshop launch`で隔離環境を作成できます。
- ホストのアクセスが適度に制限されておりAIに操作を任せてしまってもある程度安全です。
- 便利そうで今後に期待の技術です。

## 参考

https://ubuntu.com/workshop

https://github.com/canonical/workshop
