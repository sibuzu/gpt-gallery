這個 repository 在 Netlify 有兩個 site
sites/gallery/   <- 目前的 site 移到這裡
sites/design/   -> 新的 site
Gallery 2 已獨立到 https://github.com/sibuzu/gpt-gallery2 。
本機 sites/gallery2/ 是獨立 Git checkout，由此 repository 忽略。

gallery2 的圖片與同名 Markdown 分類存放：
images/清新/ <- 依服裝款式命名，例如 棉麻長洋裝-01.png／.md；相同款式連續編號
images/性感/ <- 依服裝款式命名，例如 短版旗袍-01.png／.md；相同款式連續編號
images/動漫/ <- 動漫角色系列

原 gallery 的 images/生成 已搬到 gallery2，不再重複存放。
python3 scripts/build_gallery.py --site all 只更新 gallery 與 design。
Gallery 2 的 Netlify 發布目錄是新 repository 的根目錄（.），
執行 python3 build_gallery.py，只更新該 repository 的清單、統計與快取版本。
依賴套件列於新 repository 根目錄的 requirements.txt。

各站的 images 存放於各自的發布目錄內。
gallery 保留原有瀏覽功能，生成圖片改由 gallery2 提供。

design site 則是只用 Design/ 下的 image
且 catalogs 為 現代、雲紗、雅裁、線舞、元素、民族
現代 -> 現代-*
雲紗 -> 雲紗-*
雅裁 -> 雅裁-*
線舞 -> 線舞-*
元素 -> 元素-*
民族 -> 民族-*

不用 group expand/collapse
不用 shuffle，用檔案順序
