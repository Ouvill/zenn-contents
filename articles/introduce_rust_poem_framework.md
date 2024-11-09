---
title: "RustのWebフレームワークPoemの紹介 - OpenAPIのドキュメントも同時に生成したいときの第一の選択肢"
emoji: "📖"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: [rust, openapi, poem]
published: false
---

Rustのエコシステムも徐々に発展してきてWebフレームワークもactix-web, axum, rocketなどいくつか作成されてきました。OpenAPIのドキュメントを同時に生成してくれる方法はないかと探していたところ、PoemというWebフレームワークがかなり便利だったので紹介します。

https://github.com/poem-web/poem/tree/master

## Poemとは

PoemはRust用のWebフレームワークです。以下のような特徴があります。

- 高速に動作し、簡単に扱えることを目指している。
- axumでも利用されている`tower`というライブラリを利用しており、`tower`との互換性がある
- poem-openapiを利用することでOpenAPI 3.0のドキュメントを自動的に生成できる。

Rust製のactix-webやaxumと比べるとGitHubのスター数は少ないですが筆者が試した限りかなりOpenAPIのドキュメント生成のサポートが手厚く使いやすく感じました。良いフレームワークだと思ったのに知名度が低くてもったいない感じがしたので紹介します。

もし、RustでWebフレームワークを使う機会があればPoemも検討してみてください。

## Hello World

ハンズオン形式でPoemの使い方を紹介します。

```bash
cargo new poem_example
```

Cargo.tomlには以下のように依存関係を追加します。

```toml:Cargo.toml
[package]
name = "poem_example"
version = "0.1.0"
edition = "2021"

[dependencies]
poem = "3.1.3"
tokio = { version = "1.41.1", features = ["rt-multi-thread", "macros"] }
tracing-subscriber = "0.3.18"
```

Hello Worldを表示するだけのサーバーを作成します。

```rust:src/main.rs
use poem::{
    get, handler, listener::TcpListener, middleware::Tracing, EndpointExt, Route, Server,
};

#[handler]
fn hello() -> &'static str {
    "Hello, World!"
}

#[tokio::main]
async fn main() -> Result<(), std::io::Error> {
    tracing_subscriber::fmt::init();

    let app = Route::new().at("/", get(hello)).with(Tracing);
    Server::new(TcpListener::bind("0.0.0.0:3000"))
        .run(app)
        .await
}
```

`cargo run`でサーバーを起動します。

```bash
cargo run
```

`http://localhost:3000`にアクセスすると`Hello, World!`が表示されます。特に複雑な記述をすることもなく簡単にサーバーを立ち上げることができます。

## Hello OpenAPI with OpenAPI

先程も述べたようにPoemはOpenAPIのドキュメントを自動生成します。`poem-openapi`クレートを利用します。
以下のようにCargo.tomlに追加します。

```toml:Cargo.toml
[dependencies]
poem = "3.1.3"
poem-openapi = { version = "5.1.2", features = ["swagger-ui"] }
serde = { version = "1.0.214", features = ["derive"] }
tokio = { version = "1.41.1", features = ["rt-multi-thread", "macros"] }
tracing-subscriber = "0.3.18"
```

swagger-uiを利用するために、poem-openapiに`features = ["swagger-ui"]`を追加しています。
またserdeも利用するために追加しています。

それではOpenAPIのドキュメントを自動生成するようなサーバーコードを作成しましょう。

openapiのドキュメントを生成する場合は、記述方法がじゃっかん変わります。

```rust:src/main.rs
use poem::{
    listener::TcpListener, middleware::Tracing, EndpointExt, Route, Server,
};
use poem_openapi::{OpenApi, OpenApiService};
use poem_openapi::payload::PlainText;

struct Api;

#[OpenApi]
impl Api {
    /// Hello OpenAPIと返すAPI
    #[oai(path = "/", method = "get")]
    async fn hello(&self) -> PlainText<String> {
        PlainText("Hello, OpenAPI!".to_string())
    }
}


#[tokio::main]
async fn main() -> Result<(), std::io::Error> {
    tracing_subscriber::fmt::init();

    let api_server = OpenApiService::new(Api, "Hello World", "1.0")
        .server("http://localhost:3000/");

    let swagger = api_server.swagger_ui();

    let app = Route::new()
        .nest("/", api_server)
        .nest("/swagger", swagger)
        .with(Tracing);
    Server::new(TcpListener::bind("0.0.0.0:3000"))
        .run(app)
        .await
}
```

`cargo run`でサーバーを起動します。

http://localhost:3000 で`Hello, OpenAPI!`が表示されます。

http://localhost:3000/swagger でOpenAPIのドキュメントが表示されます。

![OpenAPIが表示されることを示す画像](/images/introduce_rust_poem_framework/openapi_hello_world.png)

注目してほしいのはコードに書いていた`/// Hello OpenAPIと返すAPI`のドキュメントコメントがOpenAPIのドキュメントに反映されていることです。これがめちゃくちゃ便利です。ドキュメントコメントを書くだけでOpenAPIのドキュメントとRustのドキュメントが整備されます。

それぞれのポイントを説明します。

```rust
struct Api;

#[OpenApi]
impl Api {
    /// Hello OpenAPIと返すAPI
    #[oai(path = "/", method = "get")]
    async fn hello(&self) -> PlainText<String> {
        PlainText("Hello, OpenAPI!".to_string())
    }
}
```

`#[OpenApi]`をつけることでOpenAPIのドキュメントを生成することを示しています。`#[oai]`をつけることでエンドポイントの情報を記述します。

`path`はエンドポイントのパスを指定します。`method`はHTTPメソッドを指定します。methodは`get`, `post`, `put`, `delete`, `patch`, `head`, `options`, `connect`, `patch`, `trace`が指定できます。

詳細なドキュメントは以下に記述されています。

https://docs.rs/poem-openapi/5.1.2/poem_openapi/attr.OpenApi.html

返り値の型に`PlainText<String>`を指定することで、`Content-Type: text/plain`を返すことを表現しています。

main関数の以下の部分でOpenAPIのドキュメントを生成しています。

```rust
async fn main() -> Result<(), std::io::Error> {
    // ... 省略
    let api_server = OpenApiService::new(Api, "Hello World", "1.0")
        .server("http://localhost:3000/");

    let swagger = api_server.swagger_ui();
    let json = api_server.spec_endpoint();
    // ... 省略
}
```

`.server("http://localhost:3000/")`はOpenAPIの`servers`に記述されるURLを指定しています。

`api_server.swagger_ui()`はswagger-uiを表示するためのエンドポイントを作成します。
`api_server.spec_endpoint()`はOpenAPIのJSONを表示するためのエンドポイントを作成します。

以下の記述によって、それぞれのURLをRouterに追加に追加します。

```rust
    let app = Route::new()
        .nest("/", api_server)
        .nest("/swagger", swagger)
        .at("/openapi.json", json)
        .with(Tracing);
```

けっこう簡単にOpenAPIのドキュメントを生成できました。

## パスパラメーター

Poemでは`http://localhost:3000/hello/{name}`のようなパスパラメーターを受け取るエンドポイントを作成できます。

Apiの構造体を以下のように記述します。

```rust
use poem::{
    listener::TcpListener, middleware::Tracing, EndpointExt, Route, Server,
};
use poem_openapi::{OpenApi, OpenApiService};
use poem_openapi::param::Path;
use poem_openapi::payload::PlainText;

#[OpenApi]
impl Api {
    /// Hello OpenAPIと返すAPI
    #[oai(path = "/", method = "get")]
    async fn hello(&self) -> PlainText<String> {
        PlainText("Hello, OpenAPI!".to_string())
    }

    /// Hello {name}と返すAPI
    ///
    /// URLのパスに含まれる:nameの部分を{name}として受け取り、
    /// Hello, {name}!と返すAPI
    #[oai(path = "/hello/:name/", method = "get")]
    async fn hello_with_path(&self,
                             /// ユーザー名
                             name: Path<String>,
    ) -> PlainText<String> {
        PlainText(format!("Hello, {} !", name.0))
    }
}
```

`/hello/:name`のように`:name`を指定したところがパスパラメーターとして扱われます。

`name`の型は`Path<String>`として指定します。`name.0`のように`変数名.0`で値を取得できます。

`cargo run`でサーバーを起動します。

http://localhost:3000/hello/your_name にアクセスすると`Hello, your_name!`が表示されます。

http://localhost:3000/swagger にアクセスするとOpenAPIのドキュメントが表示されます。

![OpenAPIにドキュメントが追加されていることを示す画像](/images/introduce_rust_poem_framework/hello_name.png)

ドキュメントが自動的に生成されており、ドキュメントコメントを元に各種の詳細説明も追加されていることがわかります。

複数のパスパラメーターに対応する場合、以下のように複数指定することで対応できます。

```rust
#[OpenApi]
impl Api {
    // ... 省略
    /// Hello {name} {family_name}と返すAPI
    #[oai(path = "/hello/:family_name/:name", method = "get")]
    async fn hello_with_path2(&self,
                              /// ユーザー名
                              name: Path<String>,
                              /// ユーザーの姓
                              family_name: Path<String>,
    ) -> PlainText<String> {
        PlainText(format!("Hello, {} {} !", name.0, family_name.0))
    }
}
```

## クエリパラメーター

Poemでは`http://localhost:3000/hello?name=your_name`のようなクエリパラメーターを受け取るエンドポイントを作成できます。

Apiの構造体を以下のように記述します。

```rust
// ... 省略
use poem_openapi::param::{Path, Query};
// ... 省略

#[OpenApi]
impl Api {
    // ... 省略
    /// Hello {name}と返すAPI
    ///
    #[oai(path = "/hello", method = "get")]
    async fn hello_with_query(&self,
                              /// ユーザー名
                              name: Query<Option<String>>,
    ) -> PlainText<String> {
        match name.0 {
            None => { PlainText("Hello, World!".to_string()) }
            Some(name) => { PlainText(format!("Hello, {} !", name)) }
        }
    }
}
```

関数の引数に`name: Query<Option<String>>`のように`Query`を指定することでクエリパラメーターを受け取ることができます。

OpenAPIにもしっかりとドキュメントが追加されていることがわかります。

![クエリパラメータがOpenAPIに反映されていることを示す画像](/images/introduce_rust_poem_framework/hello_with_query.png)

`http://localhost:3000/add?num=1&num=2&num=3`のように複数の`num`を受け取るようなエンドポイントは以下のように`Query<Vec<T>>`を利用することで定義できます。

```rust
    /// クエリから受け取った数値を足し算するAPI
    ///
    /// クエリパラメーターに含まれるnumの配列を受け取り、
    /// その合計値を返すAPI
    #[oai(path = "/add", method = "get")]
    async fn add(&self,
                 /// 足し算する数値の配列
                 num: Query<Vec<i32>>,
    ) -> PlainText<String> {
        let sum: i32 = num.iter().sum();
        PlainText(format!("Sum: {}", sum))
    }
```

## リクエストボディ

Poemではリクエストボディを受け取るエンドポイントを作成できます。

jsonを受け取るようなエンドポイントは以下のように記述します。

```rust
// ... 省略
use poem_openapi::{Object, OpenApi, OpenApiService};
use poem_openapi::payload::{PlainText, Json, Form};

/// ユーザー情報
#[derive(Object, serde::Deserialize)]
struct PostUser {
    /// ユーザーの名前
    name: String,
    /// ユーザーの姓
    family_name: String,
}

struct Api;

#[OpenApi]
impl Api {
    // ... 省略
    /// Json形式で受け取ったユーザーの名前と姓を返すAPI
    #[oai(path = "/hello", method = "post")]
    async fn hello_with_json(&self,
                             // json形式で受け取るユーザー名と姓
                             request_body: Json<PostUser>,
    ) -> PlainText<String> {
        PlainText(format!("Hello, {} {} !", request_body.name, request_body.family_name))
    }
}
```

Json形式のリクエストボディを受け取る場合は関数の引数に`request_body: Json<PostUser>`のように記述します。変数の名前は任意です。

構造体`PostUser`は`#[derive(Object)]`をつけることでOpenAPIのドキュメントに反映されるようになります。

OpenAPIのドキュメントにもしっかりと反映されていることがわかります。

![alt text](/images/introduce_rust_poem_framework/hello_with_json.png)

同じような要領でJsonのオブジェクトを返せます。

```rust
/// ユーザー情報
#[derive(Object, serde::Deserialize)]
struct PostUser {
    /// ユーザーの名前
    name: String,
    /// ユーザーの姓
    family_name: String,
}

/// レスポンスメッセージ
#[derive(Object)]
struct HelloResponse {
    /// レスポンスメッセージ
    message: String,
}

#[OpenApi]
impl Api {
    // ... 省略
    /// Json形式で受け取ったユーザー名を返すAPI
    #[oai(path = "/hello", method = "post")]
    async fn hello_with_json(&self,
                             /// ユーザー名
                             request_body: Json<PostUser>,
    ) -> Json<HelloResponse> {
        Json(HelloResponse {
            message: format!("Hello, {} {} !", request_body.name, request_body.family_name)
        })
    }
}
```

関数の返り値に`Json<HelloResponse>`と指定してJson形式で返すことを示しています。

## JsonとFormの両方を受け取る

APIの設計にもよりますが、リクエストボディを`application/json`でも`application/x-www-form-urlencoded`でも受け取るようにできると便利です。

`application/x-www-form-urlencoded`を受け取る場合は`poem_openapi::payload::Form`を利用します。

jsonとformの両方を受け取る場合は以下のように記述します。

```rust
use poem_openapi::{ApiRequest, Object, OpenApi, OpenApiService};
use poem_openapi::param::{Path, Query};
use poem_openapi::payload::{PlainText, Json, Form};

/// ユーザー情報
#[derive(Object, serde::Deserialize)]
struct PostUser {
    /// ユーザーの名前
    name: String,
    /// ユーザーの姓
    family_name: String,
}

/// HelloAPIのリクエストメッセージ
#[derive(ApiRequest)]
enum HelloRequest {
    /// Json形式で受け取る
    ByJson(Json<PostUser>),
    /// Form形式で受け取る
    ByForm(Form<PostUser>),
}

/// レスポンスメッセージ
#[derive(Object)]
struct HelloResponse {
    /// レスポンスメッセージ
    message: String,
}


#[OpenApi]
impl Api {
    // ... 省略
    /// Json形式もしくはForm形式で受け取ったユーザー名を返すAPI
    #[oai(path = "/hello", method = "post")]
    async fn hello_with_json(&self,
                             /// ユーザー名
                             request_body: HelloRequest,
    ) -> Json<HelloResponse> {
        let request_body = match request_body {
            HelloRequest::ByJson(v) => { v.0 }
            HelloRequest::ByForm(v) => { v.0 }
        };

        Json(HelloResponse {
            message: format!("Hello, {} {} !", request_body.name, request_body.family_name)
        })
    }
}

/// メイン関数は省略
```

`HelloRequest`という列挙型を作成し、`ByJson(Json<PostUser>)`と`ByForm(Form<PostUser>)`を指定することでJsonとFormの両方を受け取れます。

enumの中身は一緒なので、`match`で中身を取り出しています。その後は同じように処理を行います。

## HTTPステータスコードを指定する。

今までは`PlainText`や`Json`を返していました。HTTPステータスコードを指定していなかったので、デフォルトのHTTPステータスコード 200が返されていました。しかし、実際には200以外のステータスコードを返すこともあります。たとえば処理途中でサーバーエラーが発生した場合には500エラーを返却するでしょう。

50%の確率で500エラーを返すAPIを作成してみましょう。

randクレートを利用して50%の確率で500エラーを返すAPIを作成します。

```
cargo add rand
```

サーバーコードは以下のようになります。

```rust
use poem_openapi::{ApiRequest, ApiResponse, Object, OpenApi, OpenApiService};
use poem_openapi::payload::{PlainText, Json, Form};
use rand::prelude::*;

/// RandomAPIのレスポンスメッセージ
#[derive(ApiResponse)]
enum RandomResponse {
    /// 成功した場合
    #[oai(status = 200)]
    Success(PlainText<String>),
    /// サーバーエラーが発生した場合
    #[oai(status = 500)]
    InternalServerError(PlainText<String>),
}

#[OpenApi]
impl Api {
// ... 省略

    /// 運試しAPI
    /// 
    /// 50%の確率で成功もしくはサーバーエラーを返すAPI
    #[oai(path = "/random", method = "get")]
    async fn random(&self) -> RandomResponse {
        let r: f64 = random();
        if r < 0.5 {
            RandomResponse::Success(PlainText(format!("Success: {}", r)))
        } else {
            RandomResponse::InternalServerError(PlainText(format!("Error: {}", r)))
        }
    }
}

// main関数は省略
```

列挙型`RandomResponse`を作成し、`#[derive(ApiResponse)]`を指定。 `#[oai(status = 200)]`や`#[oai(status = 500)]`を指定することでステータスコードを指定できます。

関数は各ステータスコードに対応する列挙型を返すようにします。

生成するOpenAPIのドキュメントにもステータスコードが反映されます。

![alt text](/images/introduce_rust_poem_framework/random.png)

レスポンスがenumに固定されるため、かっちりとしたAPIを作成できます。

## APIのグループ化

これまでは`Api`という構造体にエンドポイントをまとめていましたが、複数の構造体にエンドポイントを分割できます。

`Api`構造体を削除し、`HelloApi`と`RandomApi`という構造体にエンドポイントを分割します。

```rust
use poem::{
    listener::TcpListener, middleware::Tracing, EndpointExt, Route, Server,
};
use poem_openapi::{ApiRequest, ApiResponse, Object, OpenApi, OpenApiService, Tags};
use poem_openapi::param::{Path, Query};
use poem_openapi::payload::{PlainText, Json, Form};
use rand::prelude::*;

/// OpenApiのタグ
#[derive(Tags)]
enum ApiTags {
    /// Hello Api
    Hello,
    /// Random Api
    Random,
}

// ... 各種構造体の定義を省略

struct HelloApi;

#[OpenApi(tag = "ApiTags::Hello")]
impl HelloApi {
    /// Hello OpenAPIと返すAPI
    #[oai(path = "/", method = "get")]
    async fn hello(&self) -> PlainText<String> {
        PlainText("Hello, OpenAPI!".to_string())
    }

    // ... 省略
    // その他のエンドポイント
}

struct RandomApi;

#[OpenApi(tag = "ApiTags::Random")]
impl RandomApi {
    /// 運試しAPI
    ///
    /// 50%の確率で成功もしくはサーバーエラーを返すAPI
    #[oai(path = "/random", method = "get")]
    async fn random(&self) -> RandomResponse {
        let r: f64 = random();
        if r < 0.5 {
            RandomResponse::Success(PlainText(format!("Success: {}", r)))
        } else {
            RandomResponse::InternalServerError(PlainText(format!("Error: {}", r)))
        }
    }
}


#[tokio::main]
async fn main() -> Result<(), std::io::Error> {
    tracing_subscriber::fmt::init();

    // APIをタプルでグループ化
    let api_server = OpenApiService::new((HelloApi, RandomApi), "Hello World", "1.0")
        .server("http://localhost:3000/");

    let swagger = api_server.swagger_ui();
    let json = api_server.spec_endpoint();

    let app = Route::new()
        .nest("/", api_server)
        .nest("/swagger", swagger)
        .at("/openapi.json", json)
        .with(Tracing);
    Server::new(TcpListener::bind("0.0.0.0:3000"))
        .run(app)
        .await
}
```

`HelloApi`と`RandomApi`という構造体を作成し、それぞれにエンドポイントを記述します。

api_serverのインスタンスを作成するとき`OpenApiService::new((HelloApi, RandomApi), "Hello World", "1.0")`というようにタプルでAPIをグループ化するとApiを統合できます。

必須ではないですが、`#[derive(Tags)]`を指定した`enum ApiTags`を作成し、`#[OpenApi(tag = "ApiTags::Hello")]`や`#[OpenApi(tag = "ApiTags::Random")]`を指定することでOpenAPIタグを指定できます。APIをグループ化することで、Swagger UIが見やすくなります。

![alt text](/images/introduce_rust_poem_framework/api_merge.png)

## 状態

Poemでは状態を保持できます。アクセスされるたびにカウンターをインクリメントするAPIを作成してみましょう。

```rust
use std::sync::Arc;
use poem::{
    listener::TcpListener, middleware::Tracing, EndpointExt, Route, Server,
};
use poem_openapi::{ApiRequest, ApiResponse, Object, OpenApi, OpenApiService, Tags};
use tokio::sync::Mutex;

/// OpenApiのタグ
#[derive(Tags)]
enum ApiTags {
    /// Hello Api
    Hello,
    /// Random Api
    Random,
}

struct AppState {
    counter: Mutex<u32>,
}

struct CounterApi;

#[OpenApi(tag = "ApiTags::Counter")]
impl CounterApi {
    /// カウンターをインクリメントするAPI
    ///
    /// カウンターをインクリメントし、その値を返すAPI
    #[oai(path = "/counter", method = "get")]
    async fn counter(&self,
                     /// カウンターの値
                     state: poem::web::Data<&Arc<AppState>>,
    ) -> PlainText<String> {
        let mut counter = state.counter.lock().await;
        *counter += 1;
        PlainText(format!("Counter: {}", counter))
    }
}


#[tokio::main]
async fn main() -> Result<(), std::io::Error> {
    tracing_subscriber::fmt::init();

    // 状態を保持するためのstateを作成
    // ArcとMutexを利用してスレッドセーフにする
    let state = Arc::new(AppState { counter: Mutex::new(0) });
    let api_server = OpenApiService::new((HelloApi, RandomApi, CounterApi), "Hello World", "1.0")
        .server("http://localhost:3000/");

    let swagger = api_server.swagger_ui();
    let json = api_server.spec_endpoint();

    let app = Route::new()
        .nest("/", api_server)
        .nest("/swagger", swagger)
        .at("/openapi.json", json)
        .data(state)
        .with(Tracing);
    Server::new(TcpListener::bind("0.0.0.0:3000"))
        .run(app)
        .await
}
```

`AppState`という構造体を作成し、`counter`というカウンターを保持します。
`CounterApi`という構造体を作成し、`counter`というエンドポイントを作成します。引数に`state: poem::web::Data<&Arc<Mutex<AppState>>>`を指定することで状態を受け取ります。
main関数で`Arc::new(Mutex::new(AppState { counter: 0 }))`として状態を保持するためのstateを作成し、`Route::new().data(state)`でstateを登録します。

自動的に`poem::web::Data`によって`Route`に登録された状態を受け取ります。

この方法を活用すると`sqlx`や`diesel`といったSqlのライブラリからコネクションプールを各APIで利用できます。

参考

https://github.com/poem-web/poem/blob/master/examples/openapi/todos/src/main.rs

## 参考コード

公式のGitHubにはexampleが多数用意されているため、実装例を参考に開発を進められます。

https://github.com/poem-web/poem/tree/master/examples

## まとめ

PoemはRustのWebフレームワークであり、OpenAPIドキュメントの自動生成機能が優れています。特に、Rustのドキュメントコメントを書くだけでOpenAPIドキュメントが生成されるのは非常に便利です。

PythonのFastAPIやNode.jsのHonoなどコードファーストのドキュメント生成を好む人には非常に使いやすいフレームワークだと感じました。
