# Pocket Hello

「今天也要开心呀 (๑•ᴗ•๑)」是一份从 NFC 小板子里打开的网页礼物。彩纸烟花会在开场拼成第一张问候，随后铺开一屏小纸条。点开纸条可以左右滑读，结尾的纸条会拼成彩纸比心。点标题旁的小红花可以打开一张特别的纸条，底部的小信封里有一封信。

这个文件夹可以独立预览和发布。网页使用 HTML、CSS 和 JavaScript，无需构建。

## 本地预览

在本文件夹打开终端，运行以下命令，再访问 [http://127.0.0.1:8766/](http://127.0.0.1:8766/)。

```powershell
python -m http.server 8766 --bind 127.0.0.1
```

## 改纸条和信件

用文本编辑器打开 [messages.js](./messages.js)，修改引号里的文字。新增纸条时照着已有格式另起一行，保留引号和行末逗号。

| 字段 | 内容 |
| --- | --- |
| `notes` | 普通小纸条 |
| `featuredNotes` | 优先出现在大张亮色纸条上的句子 |
| `times` | 按访客设备的当地时间选择的开场问候 |
| `secretNote` | 点小红花打开的特别纸条 |
| `letter` | 信封里的信，每个字符串是一段 |

## 放背景音乐

打包版已配置 [Carefree.mp3](./music/Carefree.mp3)。更换音乐时，把新文件放进 [music](./music/) 文件夹，再到 [messages.js](./messages.js) 改成实际路径。例如：

```js
music: "./music/bgm.mp3",
```

更换曲目时一起更新 `musicCredit`，它会显示在信件底部。配置曲目后，进入网页会默认尝试播放。如果浏览器拦截，第一次点按页面时会重试，也可以点右上角小人播放或暂停。保持 `music: ""` 时，网页没有背景音乐。

当前配乐为《Carefree》，作者 Kevin MacLeod。包内 MP3 由提供的音频转码。 [原曲与作者署名](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400037) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## 发布到 GitHub Pages

1. 在 GitHub 新建公开仓库，例如 `pocket-hello`。
2. 在仓库首页选择 **Add file → Upload files**，把**本文件夹里面的内容**上传到仓库根目录。确认仓库首页直接看到 `index.html`、`style.css`、`messages.js` 和 `music/`。把 `.nojekyll` 一起上传，保留 `music/Carefree.mp3` 的目录结构。
3. 打开仓库的 **Settings → Pages**，把 **Source** 设为 **Deploy from a branch**，选择 **main** 和 **/(root)**，保存。仓库若使用其他默认分支，就选择实际上传文件的分支。 [GitHub Pages 官方步骤](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
4. 发布完成后，从 Pages 设置页复制正式 HTTPS 地址。项目网址格式通常是 `https://你的用户名.github.io/pocket-hello/`。先用国内手机流量打开这个网址，确认纸条能正常显示，右上角小人能播放音乐，再把该地址写进 PCB 上的 NTAG213。

以后更换文案或音乐，修改同一个仓库里的文件即可。只要网站地址保持不变，就可以继续使用已经写好的 NFC 标签。
