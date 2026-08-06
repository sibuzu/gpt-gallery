1. sites/design/images/*.md
下面有衣服的描述，若是字數 > 15，則進行 summarize，然後將 clothes summary 寫回原檔案，如
'''
[clothes summary ...]

original long clothes description ....
...
'''

original long clothes description 會先 trim，所以 [clothes summary ...] 與 original long clothes description 只會有一個空行

若是 字數 <= 15, pass
若是第一行是 [...], 已summarized, pass

2. Summarize 的要點，參考下面對話:
精簡服裝重點，如
She is wearing an elegant avant-garde summer mini outfit featuring a fitted asymmetric crop top with a soft twisted front detail that naturally enhances the bust. The top flows into a high-waisted draped mini skirt with an overlapping tulip hem that reveals the legs while maintaining graceful movement. Lightweight silk jersey, sheer chiffon side panels, and subtle waist cut-outs create an effortlessly sensual silhouette. Colors include ivory, champagne, and pearl white. Minimalist luxury, breathable, feminine, sophisticated, editorial fashion.

給我 
a crop top with high-waisted draped mini skirt

--
一些修飾詞可以拿掉，強調主體，不要超過12 words，如 [an apron-inspired contemporary mini outfit with delicate summer chiffon tailoring] 就太長，可精簡為 [an apron-inspired mini outfit with chiffon tailoring]。

--
若是有 inspired by 可能是衣服特色重點，

--
1. **保留完整服裝結構**
   * 有上衣＋裙子 → `[crop top with mini skirt]`
   * 有洋裝 → `[mini dress with XXX top]` 或 `[XXX mini dress]`
   * 有褲子 → `[top with wide-leg pants]`

2. **保留最有辨識度的 inspired 元素**
   * kimono → `kimono-inspired`
   * Hanfu → `Hanfu-inspired`
   * magnolia petals → `magnolia petal`
   * 等等。

3. **刪除次要修飾**
   * 去掉顏色、材質（除非是主要特色）、舒適度、luxury、editorial、sensual 等形容詞。

4. **不超過約 12 個 words**（必要時可略超一兩個，但盡量控制）。

例如這句：
> She is wearing an avant-garde summer mini dress featuring a sculptural asymmetric crop top composed of layered transparent magnolia-inspired organza petals...
要回答：
[mini dress with magnolia petal crop top]

而不是：
[magnolia petal crop top]
因為後者缺少下半身，不算完整服裝。
