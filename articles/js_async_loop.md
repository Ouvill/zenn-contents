---
title: "JavaScriptのasync/awaitが関わるLoop処理"
emoji: "➿"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ['javascript', 'async', 'loop','promise']
published: true
---

## JavaScriptのLoop処理

JavaScriptのfor文やwhile文のループ処理はご存知でしょうか？

jsを書いたことがある人ならば「基本文法だからそんなの知っているよ」って人が多いと思います。jsのループ処理は色々な書き方があります。

なにかの配列に対してループ処理を行う場合、配列の`forEach`や構文の`for`や`while`が使えます。

配列の`forEach`を使ったループ処理は以下のようになります。

```js
// 配列を引数に受け取り、forEachを使ってループ処理を行う関数
function forEachLoop(arr) {
  arr.forEach((i) => {
    console.log(i);
  });
}

// メイン関数
function main() {
  const arr = [1, 2, 3, 4, 5];
  forEachLoop(arr);
  console.log("done");
}

// 実行
main();
```

実行結果

![alt text](/images/js_async_loop/foreach.png)

`for of`を使ったループ処理は以下のようになります。

```js
// 配列を引数に受け取り、for ofを使ってループ処理を行う関数
function forOfLoop(arr) {
  for (const i of arr) {
    console.log(i);
  }
}

// メイン関数
function main() {
  const arr = [1, 2, 3, 4, 5];
  forOfLoop(arr);
  console.log("done");
}

// 実行
main();
```

実行結果

![alt text](/images/js_async_loop/forOf.png)

どちらも同じような実行結果になりました。

では、Promise, async/awaitを使ったループ処理はどうなるでしょうか。

## Promise, async/awaitを使ったループ処理

Promise, async/await を使ったループ処理を書いてみましょう。

### forEach

配列の`forEach`を使ったループ処理を書いてみます。最初に言いますが、**非同期関数を扱うときは`forEach`は使わない方が良いです**。

```js
// 指定した時間待機するPromiseを返す関数
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// 配列を引数に受け取り、forEach内でasync/awaitを使ってループ処理を行う関数
function asyncForEach(arr) {
  arr.forEach(async (i) => {
    await sleep(1000);
    console.log(i);
  });
}

// メイン関数
async function main() {
    const arr = [1, 2, 3, 4, 5];
    asyncForEach(arr);
    console.log("done");
}

// 実行
main();
```

このコードを実行すると、`done`が先に表示されてしまいます。

![alt text](/images/js_async_loop/asyncForEachResult.png)

なぜでしょうか？

`forEach`は配列の各要素を引数にする関数を実行します。`forEach`に渡されているのは`async`のついたアロー関数です。`async`関数は`Promise`を返します。つまり以下のような関数と似たような動作をします。

```js
// 配列を引数に受け取り、forEach内でPromiseを使ってループ処理を行う関数
function asyncForEachWithPromise(arr) {
  arr.forEach((i) => {
    // Promiseを返す。つまり、forEachは関数が終了したとみなし、次の処理に進む。
    return new Promise(resolve => {
        sleep(1000).then(() => {
            console.log(i);
            resolve();
        });
    })
  }),
}
```

関数からなにかがreturnされたら、それは関数の終了を意味します。`forEach`は`Promise`のなかの`sleep`の処理が終わるまで待たず、次の処理を実行します。配列の各要素に対して同じように行ない`forEach`はすぐに終了します。
そのため、`done`が先に表示されてしまいます。

以下のように`forEach`の宣言に`await`を追加したとしても、`forEach`はPromiseを返しません。`forEach`は各関数の返り値を無視し、何も返しません。よって`arr.forEach`の手前に追加した`await`は無視されます。

```js
// 指定した時間待機するPromiseを返す関数
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// 配列を引数に受け取り、forEach内でasync/awaitを使ってループ処理を行う関数
async function asyncForEach(arr) {   // async を追加
  await arr.forEach(async (i) => {   // forEachの手前に await を追加。でもPromiseが返らないので意味がない
    await sleep(1000); 
    console.log(i);
  });
}

// メイン関数
async function main() {
    const arr = [1, 2, 3, 4, 5];
    await asyncForEach(arr);       // await を追加
    console.log("done");
}

// 実行
main();
```

実行結果は以下のようになります。doneが先に表示されます。

![alt text](/images/js_async_loop/asyncForEachResult02.png)

`forEach`のアロー関数に記述された`async/await`は意味がないのでしょうか？

そうではありません。`forEach`の中に記述されたアロー関数の`async`は、アロー関数内で`await`を使えます。ただそれだけで、アロー関数の外側の`forEach`には影響しません。

```js
// 配列を引数に受け取り、forEach内でasync/awaitを使ってループ処理を行う関数
function asyncForEach(arr) {
  arr.forEach(
    // ここの関数のasyncは
    async (i) => {
      // ここのawaitで意味がある。が、forEachには影響しない。
      await sleep(1000);
      console.log(i);
  });
}
```

このように非同期処理を行うときは`forEach`を使わない方が良いでしょう。

次に、`forEach`の代わりに`for of`を使ってみましょう。

### for of

構文の`for of`を使ったループ処理は以下のようになります。

```js
// 指定した時間待機するPromiseを返す関数
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// 配列を引数に受け取り、for of内でasync/awaitを使ってループ処理を行う関数
async function asyncForOf(arr) {
  for (const i of arr) {
    await sleep(1000);
    console.log(i);
  }
}

// メイン関数
async function main() {
    const arr = [1, 2, 3, 4, 5];
    await asyncForOf(arr);
    console.log("done");
}

// 実行
main();
```

実行結果は以下のようになります。

![alt text](/images/js_async_loop/asyncForOf.gif)

実行結果を見ると、順番に1秒ずつ待機してから表示されていることがわかります。

`for of`を利用したループ処理では、ループ内の`await`を待ちます。逐次実行してほしい場合は`for of`を使うと良いでしょう。

もう一度比較のために一部コードを抜粋します。

`for of`の`await`は、関数定義の`async`スコープで動作します。`forEach`のときはアロー関数の`async`スコープで動作していたのと違います。

```js
// for of 版
async function asyncForOf(arr) {    // ← ここのasync と
  for (const i of arr) {
    await sleep(1000);              // ← ここのawaitが対応する。
    console.log(i);
  }
}

// forEach 版
function asyncForEach(arr) {
  // forEach の返り値は`void(undefind)`なので、await が効かない。
  arr.forEach(
    async (i) => {                  // ← ここのasync と
      await sleep(1000);            // ← ここのawaitが対応する。
      console.log(i);
  });
}
```

ということで非同期処理を逐次処理で行いときは`for of`を使いましょう。

## map と Promise.all

`for of`を使ったループ処理は逐次処理を行うのに適しています。しかし、並行処理をしたいときはどのようにすればよいでしょうか。たとえば配列にそれぞれの処理を行うが、それぞれの処理は独立していて順番に実行する必要がなく、すべて完了したことがわかれば良い場合です。

その場合は配列の`map`と`Promise.all`を使うと良いでしょう。

```js
// 指定した時間待機するPromiseを返す関数
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// 配列を引数に受け取り、map内でasync/awaitを使ってループ処理を行う関数
async function asyncMap(arr) {
  // mapメソッドは関数の返り値を配列にして返す
  const tasks = arr.map(async (i) => {
    await sleep(1000);
    console.log(i);
  });

  await Promise.all(tasks);
}

// メイン関数
async function main() {
    const arr = [1, 2, 3, 4, 5];
    await asyncMap(arr);
    console.log("done");
}

// 実行
main();
```

実行結果は以下のようになります。

![alt text](/images/js_async_loop/asyncMap.gif)

並行的にsleep関数が実行されているため、各数字がほぼ同時に表示されています。そして、最後に`done`が表示されています。

配列の`map`メソッドは、配列の各要素に対して関数を適用し、その返り値を新しい配列の要素として返します。今回は`map`メソッドに`async`関数を渡しています。`async`関数は`Promise`を返すため、`map`メソッド全体としては`[Promise, Promise, Promise, ...]`の配列を作成します。

`Promise.all`は、`Promise`の配列を受け取り、全ての`Promise`が終了(resolve)されるまで待ちます。全ての`Promise`が終了したら、`Promise.all`は終了します。

よって、並行処理を行いたいときは`map`と`Promise.all`を使うと良いでしょう。

ちなみに`Promise.all`はすべての`Promise`の結果の配列を返します。例えば、以下のように配列の要素を2倍にして返す処理を追加できます。

```js
// 指定した時間待機するPromiseを返す関数
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// 配列を引数に受け取り、map内でasync/awaitを使ってループ処理を行う関数
async function asyncMap(arr) {
  // mapメソッドは関数の返り値を配列にして返す
  const tasks = arr.map(async (i) => {
    await sleep(1000);
    console.log(i);
    return i * 2;       // 2倍にして返す処理を追加
  });

  return await Promise.all(tasks);  // Promise.allの結果を返す
}

// メイン関数
async function main() {
    const arr = [1, 2, 3, 4, 5];
    const result = await asyncMap(arr);
    console.log(result);    // [2, 4, 6, 8, 10]
    console.log("done");
}

// 実行
main();
```


## まとめ

JavaScriptのループ処理について、`forEach`、`for of`、`map`を使ったループ処理を紹介しました。

- `forEach`は非同期処理を行うときは使わない方が良い
- `for of`は逐次処理
- `map`と`Promise.all`は並行処理

処理に応じて適切なループ処理を選択しましょう。

## 参考

- [プロミスの使用 - JavaScript | MDNMDN Web DocsMDN logoMozilla logo](https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Using_promises)
- [Array.prototype.forEach() - JavaScript | MDNMDN Web DocsMDN logoMozilla logo](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach)
- [for...of - JavaScript | MDNMDN Web DocsMDN logoMozilla logo](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for...of)
- [Array.prototype.map() - JavaScript | MDNMDN Web DocsMDN logoMozilla logo](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/map)
- [Promise.all() - JavaScript | MDNMDN Web DocsMDN logoMozilla logo](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)
