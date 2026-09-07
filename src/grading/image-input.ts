import {GradingError} from './schema.ts';
export const acceptedImageTypes=['image/jpeg','image/png','image/webp'];
export function validateImageFile(file:Pick<File,'type'|'size'>){
 if(!acceptedImageTypes.includes(file.type))throw new GradingError('INVALID_IMAGE','JPEG・PNG・WebP画像を選択してください。HEICの場合はJPEGにしてから選択してください。');
 if(!file.size)throw new GradingError('INVALID_IMAGE','画像ファイルが空です。');
 if(file.size>10*1024*1024)throw new GradingError('IMAGE_TOO_LARGE','10MB以下の画像を選択してください。');
}
export async function fileToImage(file:File):Promise<{mime:string;base64:string;previewUrl:string}>{
 validateImageFile(file);const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=url;await image.decode();
  if(image.naturalWidth<32||image.naturalHeight<32||image.naturalWidth*image.naturalHeight>25_000_000)throw new Error('Image size');
  // Check decodability without modifying the user's image. Server normalizes it.
  const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return {mime:file.type,base64:btoa(binary),previewUrl:url};
 }catch{URL.revokeObjectURL(url);throw new GradingError('INVALID_IMAGE','画像を表示できません。別のファイルを選択するか撮り直してください。');}
}
