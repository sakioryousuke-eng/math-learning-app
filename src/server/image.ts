import sharp from 'sharp';
import {GradingError} from '../grading/schema.ts';
export const imageByteLimit=10*1024*1024;
export async function prepareImage(base64:string,mime:string):Promise<Buffer>{
 if(!['image/png','image/jpeg','image/webp'].includes(mime))throw new GradingError('INVALID_IMAGE','JPEG・PNG・WebPの画像を選択してください。');
 if(base64.length>Math.ceil(imageByteLimit*4/3)+4)throw new GradingError('IMAGE_TOO_LARGE','画像は10MB以下にしてください。');
 if(!base64||base64.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(base64))throw new GradingError('INVALID_IMAGE','画像データが壊れています。');
 const bytes=Buffer.from(base64,'base64');
 try{
  const meta=await sharp(bytes,{limitInputPixels:25_000_000,failOn:'warning'}).metadata();
  if(`image/${meta.format}`!==mime||!meta.width||!meta.height||meta.width<32||meta.height<32||(meta.pages??1)!==1)throw new Error('Invalid format or size');
  // Full decode rejects truncated files. Normalize orientation and strip metadata.
  return await sharp(bytes,{limitInputPixels:25_000_000,failOn:'warning'}).rotate().resize({width:2000,height:2600,fit:'inside',withoutEnlargement:true}).flatten({background:'#fff'}).jpeg({quality:92}).toBuffer();
 }catch{throw new GradingError('INVALID_IMAGE','画像を読み込めません。ファイル破損や非対応形式の可能性があります。撮り直すか別の画像を選択してください。');}
}
