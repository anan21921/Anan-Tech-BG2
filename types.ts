export enum BackgroundColor {
  White = 'white',
  LightBlue = '#ADD8E6',
  Blue = '#007bff',
  Grey = '#D3D3D3',
  OffWhite = '#f8f9fa'
}

export enum DressType {
  None = 'original',
  // Men
  FormalSuitBlack = 'black formal suit and tie',
  FormalSuitNavy = 'navy blue formal suit and tie',
  FormalSuitGrey = 'grey formal suit and tie',
  WhiteShirt = 'formal white button-down shirt',
  BlueShirt = 'formal light blue button-down shirt',
  CheckeredShirt = 'formal checkered button-down shirt',
  PoloShirt = 'navy blue polo shirt',
  Panjabi = 'white traditional bengali panjabi',
  BlackPanjabi = 'black traditional bengali panjabi',
  Jubba = 'white islamic thobe',
  Sherwani = 'formal traditional sherwani',
  
  // Women
  Saree = 'formal saree',
  SalwarKameez = 'formal salwar kameez',
  WomenBlazer = 'black formal blazer for women',
  WomenWhiteShirt = 'white formal shirt for women',
  Hijab = 'black hijab with modest dress',
  Abaya = 'black abaya',
  Kurti = 'simple elegant kurti'
}

export interface PhotoSettings {
  bgColor: BackgroundColor;
  dress: DressType;
  smoothFace: boolean;
  enhanceLighting: boolean;
}

export interface ProcessingStatus {
  isProcessing: boolean;
  message: string;
  error?: string;
}