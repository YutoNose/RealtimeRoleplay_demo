const dataMap = new WeakMap<Float32Array, Record<string, Record<string, number[]>>>();

/**
 * Float32ArrayをArray(m)に正規化します。これはグラフに振幅を描画するために使用します。
 * 同じオーディオデータを描画する場合、同じ(data, m, downsamplePeaks)の組み合わせを使うことが多いので、
 * メモ化のオプションを提供します。
 */
let cache: Record<string, Record<string, number[]>> = {};
let mKey: string;
let dKey: string;

const normalizeArray = (
  data: Float32Array,
  m: number,
  downsamplePeaks = false,
  memoize = false
) => {
  // メモ化を使用する場合
  if (memoize) {
    mKey = m.toString(); // mを文字列に変換
    dKey = downsamplePeaks.toString(); // downsamplePeaksを文字列に変換
    cache = dataMap.has(data) ? dataMap.get(data) || {} : {}; // キャッシュを取得
    dataMap.set(data, cache); // データをキャッシュに保存
    cache[mKey] = cache[mKey] || {}; // mKeyのキャッシュを初期化
    if (cache[mKey][dKey]) {
      return cache[mKey][dKey]; // キャッシュがあれば返す
    }
  }
  const n = data.length; // データの長さを取得
  const result = new Array(m); // 結果の配列を作成
  if (m <= n) {
    // ダウンサンプリングの場合
    result.fill(0); // 結果を0で初期化
    const count = new Array(m).fill(0); // カウント用の配列を作成
    for (let i = 0; i < n; i++) {
      const index = Math.floor(i * (m / n)); // インデックスを計算
      if (downsamplePeaks) {
        // ピークをダウンサンプリングする場合
        result[index] = Math.max(result[index], Math.abs(data[i])); // 最大値を取得
      } else {
        result[index] += Math.abs(data[i]); // 絶対値を加算
      }
      count[index]++; // カウントを増やす
    }
    if (!downsamplePeaks) {
      for (let i = 0; i < result.length; i++) {
        result[i] = result[i] / count[i]; // 平均を計算
      }
    }
  } else {
    // mがnより大きい場合
    for (let i = 0; i < m; i++) {
      const index = (i * (n - 1)) / (m - 1); // インデックスを計算
      const low = Math.floor(index); // 下のインデックス
      const high = Math.ceil(index); // 上のインデックス
      const t = index - low; // 補間用の値
      if (high >= n) {
        result[i] = data[n - 1]; // 最後のデータを使用
      } else {
        result[i] = data[low] * (1 - t) + data[high] * t; // 線形補間
      }
    }
  }
  if (memoize) {
    cache[mKey][dKey] = result; // 結果をキャッシュに保存
  }
  return result; // 結果を返す
};

export const WavRenderer = {
  /**
   * オーディオサンプルの時点のスナップショットを描画します。通常は周波数値です。
   * @param canvas - 描画するキャンバス
   * @param ctx - キャンバスの描画コンテキスト
   * @param data - オーディオデータ
   * @param color - バーの色
   * @param pointCount - 描画するバーの数
   * @param barWidth - バーの幅（ピクセル）
   * @param barSpacing - バーの間隔（ピクセル）
   * @param center - バーを垂直に中央に配置するかどうか
   */
  drawBars: (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    data: Float32Array,
    color: string,
    pointCount = 0,
    barWidth = 0,
    barSpacing = 0,
    center = false
  ) => {
    const maxPoints = Math.floor(
      (canvas.width - barSpacing) / (Math.max(barWidth, 1) + barSpacing)
    ); // 最大ポイント数を計算
    const calculatedPointCount = pointCount === 0 ? maxPoints : Math.min(pointCount, maxPoints); // 実際のポイント数を決定
    const calculatedBarWidth = barWidth === 0 ? 
      (canvas.width - barSpacing) / calculatedPointCount - barSpacing : 
      barWidth; // バーの幅を決定

    const points = normalizeArray(data, calculatedPointCount, true); // 正規化された配列を取得
    for (let i = 0; i < calculatedPointCount; i++) {
      const amplitude = Math.abs(points[i]); // 振幅を取得
      const height = Math.max(1, amplitude * canvas.height); // 高さを計算
      const x = barSpacing + i * (calculatedBarWidth + barSpacing); // x座標を計算
      const y = center ? (canvas.height - height) / 2 : canvas.height - height; // y座標を計算
      ctx.fillStyle = color; // 色を設定
      ctx.fillRect(x, y, calculatedBarWidth, height); // バーを描画
    }
  },
};
