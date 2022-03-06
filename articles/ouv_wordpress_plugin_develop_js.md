---
title: "WordPressプラグイン開発を行い独自のJavaScriptを配布する"
emoji: "🔨"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: [wordpress, javascript]
published: false
---

以下の wordpress.org のプラグイン開発解説を参考に行っていく。

https://developer.wordpress.org/plugins/intro/

本記事は以下のことを目的とする

- Docker を利用した WordPress 環境の用意
- 独自開発の JavaScript を配布

## 前提環境

- ターミナルが利用できること
- docker, docker-compose 導入済み

## 開発環境の用意

今回開発するプラグインの名前は"awesome-plugin"にする（訳：すごいプラグイン）

plugin 用の開発フォルダを作成する

```
mkdir awesome-plugin
cd awesome-plugin
```

配布物を保存する dist フォルダを用意する。

```
mkdir dist
```

開発しやすいように Docker コンテナを準備する。

`docker-compose.yml`

```yml
version: "3.1"

services:
  wordpress:
    image: wordpress
    ports:
      - 8080:80
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_USER: exampleuser
      WORDPRESS_DB_PASSWORD: examplepass
      WORDPRESS_DB_NAME: exampledb
	  WORDPRESS_DEBUG: 1
    volumes:
      - wordpress:/var/www/html
      - ./dist:/var/www/html/wp-content/plugins/awesome-plugin # ← 各自のプラグインの名前に変更する。

  db:
    image: mysql:5.7
    environment:
      MYSQL_DATABASE: exampledb
      MYSQL_USER: exampleuser
      MYSQL_PASSWORD: examplepass
      MYSQL_RANDOM_ROOT_PASSWORD: "1"
    volumes:
      - db:/var/lib/mysql

volumes:
  wordpress:
  db:
```

各オプションについては docker hub の記載を参照

https://hub.docker.com/_/wordpress/

## WordPress の起動

以下のコマンドで wordpress の環境が立ち上がる。

```
docker-compose up
```

"localhost:8080"で wordpress にアクセスできるか確認。
言語、ユーザー名、パスワードの設定を行い管理画面にアクセスする。
アクセスできたら動作確認完了

### docker-compose で利用する各種コマンド

起動、停止、削除は以下のようにしてできる。

- wordpress の起動: `docker-compose up`
- wordpress の停止: docker-compose をしたターミナルで`Ctrl+C` 、もしくは`docker-compose stop`
- コンテナのデータをすべて削除: `docker-compose down --volume --remove-orphans`
- wordpress、mysql のコンテナイメージも削除: `docker-compose down --volume --remove-orphans --rmi all`

## プラグインの開発

`dist/awesome-plugin.php`のファイルを作成する。

以下のようにプラグインの情報を記載する。

```php
<?php
/**
 * Plugin Name: プラグインの名前
 * Description: 説明
 * Version: 0.0.1
 * Author: 作者名
 * Author URI: 作者ホームページ
 * License: GPLv3 or later
 * License URI: http://www.gnu.org/licenses/gpl-3.0.html
 */
```

各種設定項目は下記 URL を参考

https://developer.wordpress.org/plugins/plugin-basics/header-requirements/

## 今回開発するプラグインの概要

今回はプラグインを有効にすると、プラグインに同梱した JavaScript が読み込まれて、`alert("Hello World")`が実行されるようにする。

## プラグイン開発

`dist/awesome-plugin.php`を編集する。

変数は関数の競合を避けるために関数定義、変数定義にはすべて prefix をつけることとｓるう。今回の prefix は`awesome_plugin`とする

```php
function awesome_plugin_add_js() {
	echo '<script src="' . esc_url(plugins_url( 'index.js', __FILE__ )) . '" ></script>';
}

add_action('wp_head', 'copy_steganography_add_js');
```

`dist/index.js`

```js
alert("Hello World");
```

## 動作確認

管理画面からプラグインの管理画面を開くと、開発したプラグインが一覧に追加されている。

![Screenshot from 2022-03-06 21-28-25.png](/images/ouv_wordpress_plugin_develop_js/2f0a49bc1f364a58a6287bb05340e649.png)

プラグインを有効にしたとき、Hello World のアラートが表示されたらプラグインの導入はできている。

![Screenshot from 2022-03-06 21-29-29.png](/images/ouv_wordpress_plugin_develop_js/e884190409714b3eb5e26ec0abfb75bb.png)

以上

## 配布

今回の開発でプラグインに必要なファイルは`dist`フォルダに配置している。`dist`ファイルを zip 等で固めて配布する。

本記事では WordPress のプラグインストアでの配布方法については取り扱わない。

## まとめ

以下のことを紹介した

- docker-compose による開発用 WordPress の立ち上げ
- Plugin を通して WordPress に独自の JavaScript を追加
