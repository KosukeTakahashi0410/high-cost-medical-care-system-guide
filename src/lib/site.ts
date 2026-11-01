/** 誤りの連絡先 */
export const CONTACT_URL = 'https://x.com/yurufuwa_net';

/** 投げ銭のURL。OFUSE に登録したら設定する（空ならリンクを出さない） */
export const OFUSE_URL = '';

/**
 * Google Analytics 4 の測定ID（G-XXXXXXX）。ビルド時の環境変数から読む。
 * 本番環境にだけ設定し、ローカルやプレビューのアクセスは計測しない。空なら読み込まない
 */
export const GA_MEASUREMENT_ID: string = import.meta.env.PUBLIC_GA_MEASUREMENT_ID ?? '';
