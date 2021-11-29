---
title: "inotifyの上限を設定してLinuxの監視ファイル数を増やす"
emoji: "📝"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ['Linux', 'inotify']
published: true
---

Linuxではファイルの変更を検知するツールとしてinotifyというツールが利用されています。

ファイルの変更を検知する仕組みは便利で様々なアプリケーションで利用されます。

しかしながらファイルを監視する上限は定められており、それ以上の変更を監視しようとするとエラーになってしまいます。自分は大きなプロジェクトをVSCodeで開いたりしたときによくエラーになります。

inotifyの上限数を変更し、エラーを回避しましょう。

## 現在のinotifyの上限数

現在のファイルの上限数を調べるには以下のコマンドを実行します。

```
$ cat /proc/sys/fs/inotify/max_user_watches
```

## inotifyの上限数を増加させる

ファイルの監視数上限を変更する場合、以下のコマンドを実行します。

```
$ echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
$ sudo sysctl -p
```

64ビットOSの場合、一つのファイルを監視するのに1KB消費するので、524288だと最大512MB消費されるようになります。(1024*512=524288)

## まとめ

inotifyの上限数を増やしてファイルの変更監視時にエラーにならないようにする方法でした。

## 参考

- [inotify-toolsでファイルやディレクトリを監視する](https://qiita.com/stc1988/items/464410382f8425681c20)
- [LinuxでSystem limit for number of file watchers reachedが出る場合の原因と対策](https://www.virment.com/how-to-fix-system-limit-for-number-of-file-watchers-reached/)
