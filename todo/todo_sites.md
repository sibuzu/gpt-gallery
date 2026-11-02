三個站台各自使用獨立 Git repository。
各獨立站台的發布目錄均為 repository 根目錄（.）。

本機 checkouts：
- sites/gallery1/：原 gallery；標題 Gallery 1。
- sites/gallery2/：生成圖片站；標題 提示詞生成。
- sites/gallery3/：原 design；標題 Design。

GitHub：
- Gallery 1：https://github.com/sibuzu/gpt-gallery1
- Gallery 2：https://github.com/sibuzu/gpt-gallery2
- Gallery 3：https://github.com/sibuzu/gpt-gallery3

三個本機 checkout 均由此 repository 的 .gitignore 忽略，避免重複提交圖片或嵌入 Git repository。
各站的 build_gallery.py 只更新自己的圖片清單、catalog_report.json 與快取版本。
Pillow 依賴列於各站 requirements.txt。
根目錄 scripts/build_gallery.py 僅為本機建置轉接器；未 clone 的站台會略過。

Gallery 2：
- images/清新/、images/性感/ 以服裝款式命名，同款連續編號，PNG 與 MD 同名。
- images/動漫/ 以角色命名；跨作品同名加上作品名；魔法少女小圓五位角色使用指定日文名。

Gallery 3 保留原 Design 分類順序、圖片預覽、Markdown 提示詞與精簡描述。
Gallery 1 保留原 Gallery 的檔名正規化、分組、搜尋與圖片預覽。
